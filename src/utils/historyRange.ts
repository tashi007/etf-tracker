import { DailyValuation, getPeriodStartDate, ReturnPeriod } from "./returns";

export function filterHistoryByPeriod(
  history: DailyValuation[],
  period: ReturnPeriod,
  today: string,
): DailyValuation[] {
  if (period === "ITD" || history.length === 0) return history;
  const from = getPeriodStartDate(today, period);
  return history.filter((point) => point.date >= from);
}
