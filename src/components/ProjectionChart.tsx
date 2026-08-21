import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Holding } from "../types";
import { ChartTooltip } from "./ui/ChartTooltip";
import { Input } from "./ui/Field";

interface Props {
  holdings: Holding[];
  fortnightlyContribution: number;
}

interface ProjectionPoint {
  year: number;
  value10?: number | null;
  value20?: number | null;
}

const FORTNIGHT_DAYS = 14;
const DAYS_PER_YEAR = 365.25;

function projectValue(
  startValue: number,
  fortnightlyContribution: number,
  annualReturnPct: number,
  years: number,
): ProjectionPoint[] {
  const stepYears = FORTNIGHT_DAYS / DAYS_PER_YEAR;
  const totalSteps = Math.round(years / stepYears);
  const growthPerStep = Math.pow(1 + annualReturnPct / 100, stepYears);

  const points: ProjectionPoint[] = [];
  let value = startValue;
  let year = 0;

  for (let step = 0; step <= totalSteps; step += 1) {
    points.push({ year, value10: value, value20: value });
    value = value * growthPerStep + fortnightlyContribution;
    year += stepYears;
  }

  return points;
}

export function ProjectionChart({ holdings, fortnightlyContribution }: Props) {
  const [expectedReturn, setExpectedReturn] = useState(7);
  const startValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );

  const data = useMemo(() => {
    const tenYear = projectValue(
      startValue,
      fortnightlyContribution,
      expectedReturn,
      10,
    );
    const twentyYear = projectValue(
      startValue,
      fortnightlyContribution,
      expectedReturn,
      20,
    );

    return twentyYear.map((point, index) => ({
      year: Number(point.year.toFixed(1)),
      value10: index < tenYear.length ? tenYear[index].value10 : null,
      value20: point.value20,
    }));
  }, [expectedReturn, fortnightlyContribution, startValue]);

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Projection
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Starts from current portfolio value of ${startValue.toFixed(2)}.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Expected annual return (%)
          </label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={expectedReturn}
            onChange={(event) => setExpectedReturn(Number(event.target.value))}
            className="w-32"
          />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tickFormatter={(value) => `${Number(value).toFixed(0)}y`}
          />
          <YAxis tickFormatter={(value) => `$${Number(value).toFixed(0)}`} />
          <Tooltip
            content={<ChartTooltip formatter={(v) => `$${v.toFixed(2)}`} />}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value10"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="10 years"
          />
          <Line
            type="monotone"
            dataKey="value20"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={false}
            name="20 years"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Assumes fortnightly contributions are invested at the expected return
        rate.
      </p>
    </div>
  );
}
