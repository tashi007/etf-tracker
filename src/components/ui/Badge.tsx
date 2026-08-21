import { ReactNode } from "react";

type Tone = "neutral" | "gain" | "loss" | "warn" | "info";

const toneClasses: Record<Tone, string> = {
  neutral:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  gain: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  loss: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  info: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
};

interface Props {
  tone?: Tone;
  children: ReactNode;
}

export function Badge({ tone = "neutral", children }: Props) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
