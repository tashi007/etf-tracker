function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function fetchYahooPrice(symbol) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
  );

  if (!response.ok) {
    throw new Error(`Yahoo request failed for ${symbol}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;

  if (!meta) {
    throw new Error(`Missing price data for ${symbol}`);
  }

  return {
    price: meta.regularMarketPrice,
    change: meta.regularMarketPrice - meta.previousClose,
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbolsParam = req.query.symbols;
  if (!symbolsParam) {
    return res.status(400).json({ error: "Missing ?symbols= query parameter" });
  }

  const yahooSymbols = String(symbolsParam)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (yahooSymbols.length === 0) {
    return res.status(400).json({ error: "No valid symbols provided" });
  }

  try {
    const results = await Promise.all(
      yahooSymbols.map(async (yahooSymbol) => {
        const { price, change } = await fetchYahooPrice(yahooSymbol);
        const symbol = yahooSymbol.replace(/\.AX$/, "");
        return {
          symbol,
          price,
          change,
          lastUpdated: new Date().toISOString(),
        };
      }),
    );

    return res.status(200).json(results);
  } catch (error) {
    console.error("Price fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch prices" });
  }
}
