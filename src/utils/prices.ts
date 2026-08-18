import { PriceData } from "../types";

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function fetchAllPrices(
  yahooSymbols: string[],
): Promise<PriceData[]> {
  if (yahooSymbols.length === 0) return [];
  try {
    const encoded = encodeURIComponent(yahooSymbols.join(","));
    const response = await fetch(`${BACKEND_URL}/api/prices?symbols=${encoded}`);
    if (!response.ok) throw new Error("Failed to fetch prices");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching prices:", error);
    return [];
  }
}

export async function fetchHistoricalPrices(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<{ date: string; price: number }[]> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/historical/${symbol}?from=${fromDate}&to=${toDate}`,
    );
    if (!response.ok)
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    return [];
  }
}
