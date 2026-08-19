import { Transaction } from "../types";

export function calculateCAGR(
  totalInvested: number,
  currentValue: number,
  firstTransactionDate: Date | null,
): number {
  if (!firstTransactionDate || totalInvested <= 0 || currentValue <= 0)
    return 0;
  const days =
    (Date.now() - firstTransactionDate.getTime()) / (1000 * 3600 * 24);
  const years = days / 365.25;
  if (years <= 0) return 0;
  return Math.pow(currentValue / totalInvested, 1 / years) - 1;
}

export function getFirstTransactionDate(
  transactions: Transaction[],
): Date | null {
  if (!transactions || transactions.length === 0) return null;
  const earliest = Math.min(
    ...transactions.map((t) => new Date(t.date).getTime()),
  );
  return new Date(earliest);
}

export function getCumulativeHistory(
  transactions: Transaction[],
): { date: string; value: number }[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const history: { date: string; value: number }[] = [];
  let running = 0;
  for (const tx of sorted) {
    running += tx.units * tx.pricePerUnit;
    history.push({ date: tx.date, value: running });
  }
  return history;
}
