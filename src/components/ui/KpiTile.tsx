import { ReactNode } from "react";

type Trend = "gain" | "loss" | "neutral";

const trendClasses: Record<Trend, string> = {
  gain: "text-emerald-600 dark:text-emerald-400",
  loss: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-800 dark:text-slate-100",
};

interface Props {
  label: string;
  value: string;
  trend?: Trend;
  badge?: ReactNode;
}

export function KpiTile({ label, value, trend = "neutral", badge }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {badge}
      </div>
      <p className={`mt-2 truncate text-3xl font-bold ${trendClasses[trend]}`}>
        {value}
      </p>
    </div>
  );
}
