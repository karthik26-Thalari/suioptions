export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const cors = {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control":               "public, max-age=10",
    };

    try {
      // /history — 24h price chart data
      if (url.pathname === "/history") {
        const endAt   = Math.floor(Date.now() / 1000);
        const startAt = endAt - 24 * 60 * 60;
        const res  = await fetch(
          `https://api.kucoin.com/api/v1/market/candles?type=1hour&symbol=SUI-USDT&startAt=${startAt}&endAt=${endAt}`
        );
        const data = await res.json();
        const prices = (data.data || []).reverse().map(c => ({
          time:  Number(c[0]) * 1000,
          price: Number(Number(c[2]).toFixed(4)),
        }));
        return new Response(JSON.stringify({ prices, ok: true }), { headers: cors });
      }

      // / — current price
      const res  = await fetch("https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=SUI-USDT");
      const data = await res.json();
      const price = Number(data.data.price).toFixed(4);
      return new Response(JSON.stringify({ price, source: "kucoin", ok: true }), { headers: cors });

    } catch (e) {
      return new Response(JSON.stringify({ price: "0.72", ok: false, error: e.message }), { headers: cors });
    }
  },
};
