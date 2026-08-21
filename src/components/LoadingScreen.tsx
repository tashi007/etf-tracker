interface Props {
  label?: string;
}

export function LoadingScreen({ label = "Loading portfolio..." }: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="text-slate-700 dark:text-slate-200 font-medium">
        ETF Portfolio Tracker
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
