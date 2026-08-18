import { Transaction, TargetAlloc } from "../types";

export function calculateCurrentAlloc(
  transactions: Transaction[],
  enabledSymbols?: string[],
): Record<string, number> {
  const symbols = enabledSymbols ?? getEnabledSymbolsFromTx(transactions);
  const totals: Record<string, number> = {};
  for (const s of symbols) totals[s] = 0;

  let totalInvested = 0;
  for (const tx of transactions) {
    const amount = tx.units * tx.pricePerUnit;
    if (totals[tx.etf] === undefined) totals[tx.etf] = 0;
    totals[tx.etf] += amount;
    totalInvested += amount;
  }
  if (totalInvested === 0) {
    const zero: Record<string, number> = {};
    for (const s of symbols) zero[s] = 0;
    return zero;
  }
  const result: Record<string, number> = {};
  for (const s of symbols) {
    result[s] = ((totals[s] ?? 0) / totalInvested) * 100;
  }
  return result;
}

function getEnabledSymbolsFromTx(transactions: Transaction[]): string[] {
  const symbols = new Set<string>();
  for (const tx of transactions) symbols.add(tx.etf);
  return Array.from(symbols);
}

export function getNextRecommendedBuy(
  currentAlloc: Record<string, number>,
  targetAlloc: TargetAlloc,
): string {
  const symbols = Object.keys(targetAlloc.alloc);
  if (symbols.length === 0) return "";

  let maxDiff = -Infinity;
  let recommended = symbols[0];
  for (const etf of symbols) {
    const diff = (targetAlloc.alloc[etf] ?? 0) - (currentAlloc[etf] || 0);
    if (diff > maxDiff) {
      maxDiff = diff;
      recommended = etf;
    }
  }
  return recommended;
}

export function getTotalInvested(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.units * tx.pricePerUnit, 0);
}
