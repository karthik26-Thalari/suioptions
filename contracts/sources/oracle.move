module sui_options::oracle {
    use sui::clock::Clock;
    use sui::event;

    // ── Errors ─────────────────────────────────────────────
    const ENotAdmin:     u64 = 1;
    const EPriceStale:   u64 = 2;
    const EZeroPrice:    u64 = 3;

    // Max age of price before considered stale: 60 seconds
    const MAX_PRICE_AGE_MS: u64 = 60_000;

    // ── Structs ────────────────────────────────────────────

    /// Shared price feed — simulates Pyth oracle on testnet
    public struct PriceFeed has key {
        id:           UID,
        admin:        address,
        price:        u64,    // SUI/USD in cents (e.g. 480 = $4.80)
        last_update:  u64,    // timestamp ms of last update
        round:        u64,    // incrementing round number
    }

    // ── Events ─────────────────────────────────────────────
    public struct PriceUpdated has copy, drop {
        price:       u64,
        last_update: u64,
        round:       u64,
    }

    public struct PriceRead has copy, drop {
        price:       u64,
        last_update: u64,
    }

    // ── Init ───────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::share_object(PriceFeed {
            id:          object::new(ctx),
            admin:       ctx.sender(),
            price:       480,   // start at $4.80
            last_update: 0,
            round:       0,
        });
    }

    // ── Admin: update price ────────────────────────────────

    /// On mainnet this would be called by Pyth's push model.
    /// On testnet we call it manually to simulate settlement prices.
    public fun update_price(
        feed:  &mut PriceFeed,
        price: u64,
        clock: &Clock,
        ctx:   &mut TxContext,
    ) {
        assert!(ctx.sender() == feed.admin, ENotAdmin);
        assert!(price > 0,                  EZeroPrice);

        feed.price       = price;
        feed.last_update = clock.timestamp_ms();
        feed.round       = feed.round + 1;

        event::emit(PriceUpdated {
            price,
            last_update: feed.last_update,
            round:       feed.round,
        });
    }

    // ── Read price ─────────────────────────────────────────

    /// Returns current price — reverts if stale
    public fun get_price(
        feed:  &PriceFeed,
        clock: &Clock,
    ): u64 {
        // Skip staleness check if feed was never updated (testnet init)
        if (feed.last_update > 0) {
            let age = clock.timestamp_ms() - feed.last_update;
            assert!(age <= MAX_PRICE_AGE_MS, EPriceStale);
        };

        event::emit(PriceRead {
            price:       feed.price,
            last_update: feed.last_update,
        });

        feed.price
    }

    /// Returns price without staleness check — for settlement use only
    public fun get_price_unsafe(feed: &PriceFeed): u64 {
        feed.price
    }

    /// Check if price is fresh
    public fun is_fresh(feed: &PriceFeed, clock: &Clock): bool {
        if (feed.last_update == 0) return true;
        let age = clock.timestamp_ms() - feed.last_update;
        age <= MAX_PRICE_AGE_MS
    }

    // ── Getters ────────────────────────────────────────────
    public fun price(f: &PriceFeed):       u64     { f.price }
    public fun last_update(f: &PriceFeed): u64     { f.last_update }
    public fun round(f: &PriceFeed):       u64     { f.round }
    public fun admin(f: &PriceFeed):       address { f.admin }
}