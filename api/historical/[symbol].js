function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { symbol } = req.query;
  let { from, to } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: "Symbol required" });
  }

  if (!from) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    from = date.toISOString().slice(0, 10);
  }

  if (!to) {
    to = new Date().toISOString().slice(0, 10);
  }

  const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
  const toTimestamp = Math.floor(new Date(to).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${fromTimestamp}&period2=${toTimestamp}&interval=1d`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Yahoo request failed for ${symbol}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return res.status(200).json([]);
    }

    const timestamps = result.timestamp || [];
    const prices = result.indicators?.quote?.[0]?.close || [];

    const rows = timestamps
      .map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        price: prices[index] ?? null,
      }))
      .filter((row) => row.price !== null);

    return res.status(200).json(rows);
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return res.status(500).json({ error: "Historical data unavailable" });
  }
}
