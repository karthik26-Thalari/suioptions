module sui_options::options {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::clock::Clock;
    use sui::event;

    // ── Constants ──────────────────────────────────────────
    const CALL: u8 = 0;
    const PUT:  u8 = 1;
    const ACTIVE:   u8 = 0;
    const SETTLED:  u8 = 1;

    // ── Errors ─────────────────────────────────────────────
    const EExpired:        u64 = 1;
    const ENotExpired:     u64 = 2;
    const ENotITM:         u64 = 3;
    const EAlreadySettled: u64 = 4;

    // ── Core structs ───────────────────────────────────────

    /// Each option is a transferable Sui object
    public struct OptionContract has key, store {
        id: UID,
        option_type:  u8,    // CALL or PUT
        strike_price: u64,   // USD in cents  e.g. 500 = $5.00
        expiry_ms:    u64,   // unix timestamp ms
        quantity:     u64,   // SUI in MIST
        writer:       address,
        collateral:   Balance<SUI>,
        status:       u8,
    }

    /// Shared registry — tracks protocol stats
    public struct OptionsRegistry has key {
        id: UID,
        total_options: u64,
        total_volume:  u64,
    }

    // ── Events ─────────────────────────────────────────────
    public struct OptionMinted has copy, drop {
        option_id:    ID,
        option_type:  u8,
        strike_price: u64,
        expiry_ms:    u64,
        quantity:     u64,
        writer:       address,
    }

    public struct OptionExercised has copy, drop {
        option_id: ID,
        exerciser: address,
        payout:    u64,
    }

    public struct OptionExpired has copy, drop {
        option_id: ID,
        writer:    address,
        returned:  u64,
    }

    // ── Init ───────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::share_object(OptionsRegistry {
            id: object::new(ctx),
            total_options: 0,
            total_volume:  0,
        });
    }

    // ── Write options ──────────────────────────────────────

    /// Writer locks SUI collateral → gets a CALL option object
    public entry fun write_call(
        registry:     &mut OptionsRegistry,
        collateral:   Coin<SUI>,
        strike_price: u64,
        expiry_ms:    u64,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        assert!(expiry_ms > clock.timestamp_ms(), EExpired);

        let quantity = collateral.value();
        let writer   = ctx.sender();

        let option = OptionContract {
            id: object::new(ctx),
            option_type: CALL,
            strike_price,
            expiry_ms,
            quantity,
            writer,
            collateral: collateral.into_balance(),
            status: ACTIVE,
        };

        registry.total_options = registry.total_options + 1;
        registry.total_volume  = registry.total_volume  + quantity;

        event::emit(OptionMinted {
            option_id: object::id(&option),
            option_type: CALL,
            strike_price,
            expiry_ms,
            quantity,
            writer,
        });

        transfer::transfer(option, writer);
    }

    /// Writer locks SUI collateral → gets a PUT option object
    public entry fun write_put(
        registry:     &mut OptionsRegistry,
        collateral:   Coin<SUI>,
        strike_price: u64,
        expiry_ms:    u64,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        assert!(expiry_ms > clock.timestamp_ms(), EExpired);

        let quantity = collateral.value();
        let writer   = ctx.sender();

        let option = OptionContract {
            id: object::new(ctx),
            option_type: PUT,
            strike_price,
            expiry_ms,
            quantity,
            writer,
            collateral: collateral.into_balance(),
            status: ACTIVE,
        };

        registry.total_options = registry.total_options + 1;

        event::emit(OptionMinted {
            option_id: object::id(&option),
            option_type: PUT,
            strike_price,
            expiry_ms,
            quantity,
            writer,
        });

        transfer::transfer(option, writer);
    }

    // ── Trade ──────────────────────────────────────────────

    /// Writer sells option to buyer — premium goes to writer
    public entry fun sell_option(
        option:  OptionContract,
        buyer:   address,
        premium: Coin<SUI>,
        _ctx:    &mut TxContext,
    ) {
        let writer = option.writer;
        transfer::public_transfer(premium, writer);
        transfer::transfer(option, buyer);
    }

    // ── Settlement ─────────────────────────────────────────

    /// Buyer exercises if ITM before expiry
    /// settlement_price: fetched from Pyth oracle (oracle.move feeds this)
    public entry fun exercise(
        option:           OptionContract,
        settlement_price: u64,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        assert!(clock.timestamp_ms() < option.expiry_ms, EExpired);
        assert!(option.status == ACTIVE,                  EAlreadySettled);

        let is_itm = if (option.option_type == CALL) {
            settlement_price > option.strike_price
        } else {
            settlement_price < option.strike_price
        };
        assert!(is_itm, ENotITM);

        let exerciser  = ctx.sender();
        let option_id  = object::id(&option);

        let OptionContract {
            id, option_type: _, strike_price: _, expiry_ms: _,
            quantity, writer: _, collateral, status: _
        } = option;

        object::delete(id);

        event::emit(OptionExercised { option_id, exerciser, payout: quantity });
        transfer::public_transfer(coin::from_balance(collateral, ctx), exerciser);
    }

    /// After expiry — writer reclaims collateral if OTM
    public entry fun expire_option(
        option: OptionContract,
        clock:  &Clock,
        ctx:    &mut TxContext,
    ) {
        assert!(clock.timestamp_ms() >= option.expiry_ms, ENotExpired);
        assert!(option.status == ACTIVE,                   EAlreadySettled);

        let writer    = option.writer;
        let option_id = object::id(&option);

        let OptionContract {
            id, option_type: _, strike_price: _, expiry_ms: _,
            quantity, writer: _, collateral, status: _
        } = option;

        object::delete(id);

        event::emit(OptionExpired { option_id, writer, returned: quantity });
        transfer::public_transfer(coin::from_balance(collateral, ctx), writer);
    }

    // ── Getters ────────────────────────────────────────────
    public fun strike(o: &OptionContract):   u64     { o.strike_price }
    public fun expiry(o: &OptionContract):   u64     { o.expiry_ms }
    public fun quantity(o: &OptionContract): u64     { o.quantity }
    public fun writer(o: &OptionContract):   address { o.writer }
    public fun is_call(o: &OptionContract):  bool    { o.option_type == CALL }
    public fun is_put(o: &OptionContract):   bool    { o.option_type == PUT }
}