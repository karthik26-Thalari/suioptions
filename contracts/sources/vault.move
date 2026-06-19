module sui_options::vault {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::clock::Clock;
    use sui::event;

    // ── Errors ─────────────────────────────────────────────
    const EZeroDeposit:    u64 = 1;
    const ENoCollateral:   u64 = 2;
    const ENotOwner:       u64 = 3;
    const EActivCall:      u64 = 4;

    // ── Structs ────────────────────────────────────────────

    /// LP position — one per depositor
    public struct VaultPosition has key, store {
        id:            UID,
        owner:         address,
        deposited:     u64,       // SUI in MIST
        premium_earned: u64,      // lifetime premiums collected
        active_call:   bool,      // is a covered call live?
        call_strike:   u64,       // strike of live call (0 if none)
        call_expiry:   u64,       // expiry ms of live call (0 if none)
        collateral:    Balance<SUI>,
    }

    /// Shared vault registry
    public struct VaultRegistry has key {
        id:          UID,
        total_tvl:   u64,
        total_lps:   u64,
    }

    // ── Events ─────────────────────────────────────────────
    public struct Deposited has copy, drop {
        position_id: ID,
        owner:       address,
        amount:      u64,
    }

    public struct CoveredCallWritten has copy, drop {
        position_id:  ID,
        strike_price: u64,
        expiry_ms:    u64,
        premium:      u64,
    }

    public struct PremiumClaimed has copy, drop {
        position_id: ID,
        owner:       address,
        amount:      u64,
    }

    public struct Withdrawn has copy, drop {
        position_id: ID,
        owner:       address,
        amount:      u64,
    }

    // ── Init ───────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::share_object(VaultRegistry {
            id:        object::new(ctx),
            total_tvl: 0,
            total_lps: 0,
        });
    }

    // ── Deposit ────────────────────────────────────────────

    /// LP deposits SUI → gets a VaultPosition object
    public fun deposit(
        registry: &mut VaultRegistry,
        coins:    Coin<SUI>,
        ctx:      &mut TxContext,
    ) {
        let amount = coins.value();
        assert!(amount > 0, EZeroDeposit);

        let owner = ctx.sender();

        let position = VaultPosition {
            id:             object::new(ctx),
            owner,
            deposited:      amount,
            premium_earned: 0,
            active_call:    false,
            call_strike:    0,
            call_expiry:    0,
            collateral:     coins.into_balance(),
        };

        registry.total_tvl = registry.total_tvl + amount;
        registry.total_lps = registry.total_lps + 1;

        event::emit(Deposited {
            position_id: object::id(&position),
            owner,
            amount,
        });

        transfer::transfer(position, owner);
    }

    // ── Write covered call ─────────────────────────────────

    /// LP writes a covered call on their deposited SUI
    /// strike_price: USD in cents (e.g. 550 = $5.50)
    /// premium: upfront payment from buyer in SUI MIST
    public fun write_covered_call(
        position:     &mut VaultPosition,
        strike_price: u64,
        expiry_ms:    u64,
        premium:      Coin<SUI>,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        assert!(ctx.sender() == position.owner, ENotOwner);
        assert!(!position.active_call,          EActivCall);
        assert!(position.collateral.value() > 0, ENoCollateral);
        assert!(expiry_ms > clock.timestamp_ms(), 0);

        let premium_amt = premium.value();

        // Add premium to collateral balance
        balance::join(&mut position.collateral, premium.into_balance());

        position.active_call  = true;
        position.call_strike  = strike_price;
        position.call_expiry  = expiry_ms;
        position.premium_earned = position.premium_earned + premium_amt;

        event::emit(CoveredCallWritten {
            position_id:  object::id(position),
            strike_price,
            expiry_ms,
            premium:      premium_amt,
        });
    }

    // ── Settle covered call ────────────────────────────────

    /// Called after expiry — resets the active call flag
    /// If OTM: LP keeps everything. If ITM: handled by options.move exercise()
    public fun settle_covered_call(
        position: &mut VaultPosition,
        clock:    &Clock,
        ctx:      &mut TxContext,
    ) {
        assert!(ctx.sender() == position.owner,          ENotOwner);
        assert!(clock.timestamp_ms() >= position.call_expiry, 0);
        assert!(position.active_call,                    0);

        // Reset call — LP keeps premium already in balance
        position.active_call = false;
        position.call_strike = 0;
        position.call_expiry = 0;
    }

    // ── Withdraw ───────────────────────────────────────────

    /// LP withdraws all SUI (only if no active call)
    public fun withdraw(
        registry: &mut VaultRegistry,
        position: VaultPosition,
        ctx:      &mut TxContext,
    ) {
        assert!(ctx.sender() == position.owner, ENotOwner);
        assert!(!position.active_call,          EActivCall);

        let VaultPosition {
            id, owner, deposited: _, premium_earned: _,
            active_call: _, call_strike: _, call_expiry: _,
            collateral,
        } = position;

        let amount = balance::value(&collateral);
        let position_id = object::uid_to_inner(&id);
        object::delete(id);

        registry.total_tvl = if (registry.total_tvl > amount) {
            registry.total_tvl - amount
        } else { 0 };

        event::emit(Withdrawn { position_id, owner, amount });
        transfer::public_transfer(coin::from_balance(collateral, ctx), owner);
    }

    // ── Getters ────────────────────────────────────────────
    public fun tvl(r: &VaultRegistry):             u64  { r.total_tvl }
    public fun balance_of(p: &VaultPosition):      u64  { p.collateral.value() }
    public fun premium_earned(p: &VaultPosition):  u64  { p.premium_earned }
    public fun has_active_call(p: &VaultPosition): bool { p.active_call }
    public fun strike(p: &VaultPosition):          u64  { p.call_strike }
}