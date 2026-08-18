import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

function parseSymbols(req: IncomingMessage): string[] {
  const urlObj = new URL(req.url!, `http://${req.headers.host}`);
  const symbolsParam = urlObj.searchParams.get("symbols");
  if (!symbolsParam) return [];
  return symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);
}

async function fetchYahooPrice(symbol: string) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
  );
  if (!response.ok) throw new Error(`Yahoo request failed for ${symbol}`);
  const data = await response.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Missing price data for ${symbol}`);
  return {
    price: meta.regularMarketPrice as number,
    change: (meta.regularMarketPrice as number) - (meta.previousClose as number),
  };
}

async function handlePrices(req: IncomingMessage, res: ServerResponse) {
  const yahooSymbols = parseSymbols(req);
  if (yahooSymbols.length === 0) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing ?symbols= query parameter" }));
    return;
  }

  try {
    const results = await Promise.all(
      yahooSymbols.map(async (yahooSymbol) => {
        const { price, change } = await fetchYahooPrice(yahooSymbol);
        // Strip .AX suffix for the short symbol returned to frontend
        const symbol = yahooSymbol.replace(/\.AX$/, "");
        return {
          symbol,
          price,
          change,
          lastUpdated: new Date().toISOString(),
        };
      }),
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(results));
  } catch (error) {
    console.error("Price fetch error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch prices" }));
  }
}

async function handleHistorical(req: IncomingMessage, res: ServerResponse) {
  const urlObj = new URL(req.url!, `http://${req.headers.host}`);
  const symbol = urlObj.pathname.replace(/^\//, "");
  let from = urlObj.searchParams.get("from") ?? "";
  let to = urlObj.searchParams.get("to") ?? "";

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
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${fromTimestamp}&period2=${toTimestamp}&interval=1d`;

  try {
    const response = await fetch(yahooUrl);
    if (!response.ok) throw new Error(`Yahoo request failed for ${symbol}`);
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([]));
      return;
    }
    const timestamps: number[] = result.timestamp || [];
    const prices: (number | null)[] =
      result.indicators?.quote?.[0]?.close || [];
    const rows = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        price: prices[i] ?? null,
      }))
      .filter((row) => row.price !== null);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  } catch (error) {
    console.error(`Historical fetch error for ${symbol}:`, error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Historical data unavailable" }));
  }
}

export function apiPlugin(): Plugin {
  return {
    name: "vite-plugin-api",
    configureServer(server) {
      server.middlewares.use("/api/prices", (req, res, next) => {
        if (req.method === "GET") handlePrices(req, res).catch(next);
        else {
          res.writeHead(405);
          res.end();
        }
      });
      server.middlewares.use("/api/historical/", (req, res, next) => {
        if (req.method === "GET") handleHistorical(req, res).catch(next);
        else {
          res.writeHead(405);
          res.end();
        }
      });
    },
  };
}
