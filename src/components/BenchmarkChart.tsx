import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchHistoricalPrices } from "../utils/prices";

interface Props {
  portfolioHistory: { date: string; value: number }[];
  fromDate: string;
  toDate: string;
}

export function BenchmarkChart({ portfolioHistory, fromDate, toDate }: Props) {
  const [benchmarkData, setBenchmarkData] = useState<
    { date: string; benchmark: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBenchmark() {
      const raw = await fetchHistoricalPrices("IVV.AX", fromDate, toDate);
      if (raw.length === 0) {
        setLoading(false);
        return;
      }
      const startPrice = raw[0].price;
      const normalized = raw.map((d) => ({
        date: d.date,
        benchmark: (d.price / startPrice) * 100,
      }));
      setBenchmarkData(normalized);
      setLoading(false);
    }
    loadBenchmark();
  }, [fromDate, toDate]);

  if (loading)
    return <div className="text-sm text-gray-500">Loading benchmark...</div>;
  if (benchmarkData.length === 0) return null;

  // Merge portfolioHistory (which is already normalized to start=100? we need to normalize)
  const portfolioStart = portfolioHistory[0]?.value || 1;
  const portfolioNormalized = portfolioHistory.map((p) => ({
    date: p.date,
    portfolio: (p.value / portfolioStart) * 100,
  }));

  // Merge by date
  const merged = portfolioNormalized
    .map((p) => {
      const bench = benchmarkData.find((b) => b.date === p.date);
      return {
        date: p.date,
        portfolio: p.portfolio,
        benchmark: bench?.benchmark || null,
      };
    })
    .filter((m) => m.benchmark !== null);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-4">
      <h3 className="text-lg font-semibold mb-3">Portfolio vs S&P 500 (IVV)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(v) => `${v.toFixed(0)}`} />
          <Tooltip formatter={(value) => Number(value).toFixed(1)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Your Portfolio"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="#f59e0b"
            strokeWidth={2}
            name="S&P 500 (IVV)"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-2">
        Normalized to 100 at start date.
      </p>
    </div>
  );
}
