interface Props {
  label?: string;
}

export function LoadingScreen({ label = "Loading portfolio..." }: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center gap-4"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="text-gray-700 dark:text-gray-300 font-medium">
        ETF Portfolio Tracker
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
