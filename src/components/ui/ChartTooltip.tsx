import { TooltipContentProps } from "recharts";

type ChartTooltipProps = Omit<
  Partial<TooltipContentProps<number, string>>,
  "formatter"
> & {
  formatter?: (value: number, name: string) => string;
};

export function ChartTooltip({
  active,
  label,
  payload,
  formatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900">
      {label !== undefined && label !== "" && (
        <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">
          {String(label)}
        </p>
      )}
      {payload.map((entry, index) => (
        <p
          key={index}
          className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.name ?? "Value"}:</span>
          <span className="font-medium text-slate-800 dark:text-slate-100">
            {formatter && typeof entry.value === "number"
              ? formatter(entry.value, String(entry.name ?? ""))
              : String(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}
