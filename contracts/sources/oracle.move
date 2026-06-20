module sui_options::oracle {
    use sui::clock::Clock;
    use pyth::price_info::PriceInfoObject;
    use pyth::price;
    use pyth::i64;
    use pyth::pyth;

    const MAX_AGE: u64 = 60;

    public fun get_price(
        price_info_obj: &PriceInfoObject,
        clock:          &Clock,
    ): u64 {
        let p         = pyth::get_price_no_older_than(price_info_obj, clock, MAX_AGE);
        let price_i64 = price::get_price(&p);
        let raw       = i64::get_magnitude_if_positive(&price_i64);
        raw / 1_000_000
    }

    public fun get_price_unsafe(price_info_obj: &PriceInfoObject): u64 {
        let p         = pyth::get_price_unsafe(price_info_obj);
        let price_i64 = price::get_price(&p);
        let raw       = i64::get_magnitude_if_positive(&price_i64);
        raw / 1_000_000
    }
}
