import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Transaction, EtfConfig } from "../types";
import { fetchHistoricalPrices } from "../utils/prices";

interface Props {
  transactions: Transaction[];
  etfConfigs: EtfConfig[];
}

export function PortfolioValueChart({ transactions, etfConfigs }: Props) {
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function computeHistoricalPortfolio() {
      if (transactions.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const dates = transactions.map((t) => new Date(t.date));
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date();
        const fromStr = minDate.toISOString().slice(0, 10);
        const toStr = maxDate.toISOString().slice(0, 10);

        const enabledEtfs = etfConfigs.filter((e) => e.enabled);
        const priceHistory: Record<string, { date: string; price: number }[]> =
          {};
        for (const etf of enabledEtfs) {
          priceHistory[etf.symbol] = await fetchHistoricalPrices(
            etf.yahooSymbol,
            fromStr,
            toStr,
          );
        }

        const allDatesSet = new Set<string>();
        for (const etf of enabledEtfs)
          for (const d of priceHistory[etf.symbol] ?? []) allDatesSet.add(d.date);
        const allDates = Array.from(allDatesSet).sort();

        const dailyValues = [];
        for (const date of allDates) {
          let totalValue = 0;
          for (const etf of enabledEtfs) {
            const prices = priceHistory[etf.symbol] ?? [];
            let price = 0;
            for (let i = prices.length - 1; i >= 0; i--)
              if (prices[i].date <= date) {
                price = prices[i].price;
                break;
              }
            if (price === 0) continue;
            let units = 0;
            for (const tx of transactions) {
              if (tx.etf === etf.symbol && new Date(tx.date) <= new Date(date)) {
                if (tx.type === "BUY") units += tx.units;
                else if (tx.type === "SELL") units -= tx.units;
              }
            }
            totalValue += units * price;
          }
          dailyValues.push({ date, value: totalValue });
        }
        setData(dailyValues);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    computeHistoricalPortfolio();
  }, [transactions, etfConfigs]);

  if (loading)
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow animate-pulse">
        Loading chart...
      </div>
    );
  if (error)
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-red-500">
        Failed to load historical data.
      </div>
    );
  if (data.length === 0)
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-gray-500">
        Add transactions to see chart.
      </div>
    );

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        Portfolio Value Over Time
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2">
        Actual market value based on historical prices.
      </p>
    </div>
  );
}
