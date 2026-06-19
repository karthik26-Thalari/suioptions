module sui_options::deepbook_adapter {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;

    // ── Errors ─────────────────────────────────────────────
    const EInvalidMarket:  u64 = 1;
    const EZeroAmount:     u64 = 2;
    const EInvalidPrice:   u64 = 3;

    // ── Market types ───────────────────────────────────────
    const MARKET_CALL: u8 = 0;
    const MARKET_PUT:  u8 = 1;

    // ── Structs ────────────────────────────────────────────

    /// Simulates a DeepBook Predict orderbook entry for an option
    public struct OrderbookEntry has key, store {
        id:           UID,
        market_type:  u8,     // CALL or PUT
        strike_price: u64,    // USD cents
        expiry_ms:    u64,
        bid_price:    u64,    // best bid in MIST
        ask_price:    u64,    // best ask in MIST
        open_interest: u64,   // total contracts open
    }

    /// Tracks all active markets
    public struct MarketRegistry has key {
        id:             UID,
        total_markets:  u64,
        total_volume:   u64,
    }

    /// Order receipt given to buyer
    public struct OrderReceipt has key, store {
        id:           UID,
        buyer:        address,
        market_id:    ID,
        quantity:     u64,
        price_paid:   u64,
        timestamp_ms: u64,
    }

    // ── Events ─────────────────────────────────────────────
    public struct MarketCreated has copy, drop {
        market_id:    ID,
        market_type:  u8,
        strike_price: u64,
        expiry_ms:    u64,
    }

    public struct OrderFilled has copy, drop {
        receipt_id:  ID,
        buyer:       address,
        quantity:    u64,
        price_paid:  u64,
    }

    public struct PriceUpdated has copy, drop {
        market_id: ID,
        bid_price: u64,
        ask_price: u64,
    }

    // ── Init ───────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::share_object(MarketRegistry {
            id:            object::new(ctx),
            total_markets: 0,
            total_volume:  0,
        });
    }

    // ── Create market ──────────────────────────────────────

    /// Creates an orderbook market for a specific option series
    public fun create_market(
        registry:     &mut MarketRegistry,
        market_type:  u8,
        strike_price: u64,
        expiry_ms:    u64,
        initial_ask:  u64,
        ctx:          &mut TxContext,
    ) {
        assert!(market_type == MARKET_CALL || market_type == MARKET_PUT, EInvalidMarket);
        assert!(strike_price > 0, EInvalidPrice);
        assert!(initial_ask > 0,  EZeroAmount);

        let entry = OrderbookEntry {
            id:            object::new(ctx),
            market_type,
            strike_price,
            expiry_ms,
            bid_price:     initial_ask * 90 / 100,  // bid = 90% of ask
            ask_price:     initial_ask,
            open_interest: 0,
        };

        registry.total_markets = registry.total_markets + 1;

        event::emit(MarketCreated {
            market_id: object::id(&entry),
            market_type,
            strike_price,
            expiry_ms,
        });

        transfer::share_object(entry);
    }

    // ── Buy option via orderbook ───────────────────────────

    /// Buyer places a market order — gets an OrderReceipt
    public fun buy_option(
        registry:  &mut MarketRegistry,
        market:    &mut OrderbookEntry,
        payment:   Coin<SUI>,
        quantity:  u64,
        clock_ms:  u64,
        ctx:       &mut TxContext,
    ) {
        assert!(quantity > 0,          EZeroAmount);
        let price_paid = payment.value();
        assert!(price_paid > 0,        EZeroAmount);

        // Update open interest
        market.open_interest = market.open_interest + quantity;
        registry.total_volume = registry.total_volume + price_paid;

        // Premium goes to protocol (in production: routed to writer)
        transfer::public_transfer(payment, @0x0);

        let buyer   = ctx.sender();
        let receipt = OrderReceipt {
            id:           object::new(ctx),
            buyer,
            market_id:    object::id(market),
            quantity,
            price_paid,
            timestamp_ms: clock_ms,
        };

        event::emit(OrderFilled {
            receipt_id: object::id(&receipt),
            buyer,
            quantity,
            price_paid,
        });

        transfer::transfer(receipt, buyer);
    }

    // ── Update prices ──────────────────────────────────────

    /// Market maker updates bid/ask spread
    public fun update_prices(
        market:    &mut OrderbookEntry,
        bid_price: u64,
        ask_price: u64,
    ) {
        assert!(bid_price > 0 && ask_price > 0, EInvalidPrice);
        assert!(ask_price > bid_price,           EInvalidPrice);

        market.bid_price = bid_price;
        market.ask_price = ask_price;

        event::emit(PriceUpdated {
            market_id: object::id(market),
            bid_price,
            ask_price,
        });
    }

    // ── Getters ────────────────────────────────────────────
    public fun bid(m: &OrderbookEntry):           u64 { m.bid_price }
    public fun ask(m: &OrderbookEntry):           u64 { m.ask_price }
    public fun open_interest(m: &OrderbookEntry): u64 { m.open_interest }
    public fun strike(m: &OrderbookEntry):        u64 { m.strike_price }
    public fun total_volume(r: &MarketRegistry):  u64 { r.total_volume }
}