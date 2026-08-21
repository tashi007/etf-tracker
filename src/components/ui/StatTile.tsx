import { InfoPopover } from "./InfoPopover";

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
  info?: string;
}

export function StatTile({ label, value, trend = "neutral", info }: Props) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${trendClasses[trend]}`}>
        {value}
      </p>
      {info && (
        <InfoPopover text={info} className="absolute bottom-1.5 left-1.5" />
      )}
    </div>
  );
}
