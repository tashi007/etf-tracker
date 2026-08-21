import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "./ui/Card";
import { ChartTooltip } from "./ui/ChartTooltip";

interface Props {
  current: Record<string, number>;
  target: Record<string, number>;
}

const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b"];

export function AllocationChart({ current, target }: Props) {
  const data = Object.keys(current).map((key) => ({
    name: key,
    current: current[key],
    target: target[key],
  }));

  return (
    <Card title="Current vs Target Allocation (by value)">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="current"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
        {data.map((item) => (
          <div key={item.name} className="flex justify-between">
            <span className="font-medium">{item.name}:</span>
            <span>
              {item.current.toFixed(1)}% (target {item.target}%)
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
