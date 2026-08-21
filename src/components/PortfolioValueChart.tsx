import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card } from "./ui/Card";
import { DailyValuation, ReturnPeriod } from "../utils/returns";
import { filterHistoryByPeriod } from "../utils/historyRange";

interface Props {
  history: DailyValuation[];
  period: ReturnPeriod;
}

export function PortfolioValueChart({ history, period }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const data = filterHistoryByPeriod(history, period, today);

  return (
    <Card title="Portfolio Value Over Time">
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          Add transactions to see your portfolio value.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Actual market value based on historical prices.
          </p>
        </>
      )}
    </Card>
  );
}
