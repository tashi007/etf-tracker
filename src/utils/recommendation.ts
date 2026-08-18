import { Holding } from "../types";

export interface BuyRecommendation {
  symbol: string;
  amount: number;
  reason: string;
}

export function calculateBuyRecommendation(
  holdings: Holding[],
  fortnightlyAmount: number,
  targetAlloc: Record<string, number>,
): BuyRecommendation {
  const symbols = Object.keys(targetAlloc);
  if (symbols.length === 0) {
    return { symbol: "", amount: 0, reason: "No ETFs configured." };
  }

  // Build a map of current values by symbol
  const valueBySymbol: Record<string, number> = {};
  let totalValue = 0;
  for (const h of holdings) {
    valueBySymbol[h.etf] = (valueBySymbol[h.etf] ?? 0) + h.currentValue;
    totalValue += h.currentValue;
  }

  // Calculate current allocation percentages
  const currentPct: Record<string, number> = {};
  for (const s of symbols) {
    currentPct[s] = totalValue > 0 ? ((valueBySymbol[s] ?? 0) / totalValue) * 100 : 0;
  }

  if (totalValue === 0) {
    // No holdings yet — recommend the ETF with the highest target allocation
    let bestSymbol = symbols[0];
    let bestPct = 0;
    for (const s of symbols) {
      const pct = targetAlloc[s] ?? 0;
      if (pct > bestPct) {
        bestPct = pct;
        bestSymbol = s;
      }
    }
    return {
      symbol: bestSymbol,
      amount: fortnightlyAmount,
      reason: `No holdings yet. Allocate 100% to ${bestSymbol} (highest target at ${bestPct}%).`,
    };
  }

  // Find the most underweight ETF
  let worstSymbol = symbols[0];
  let worstDeficit = -Infinity;
  for (const s of symbols) {
    const target = targetAlloc[s] ?? 0;
    const current = currentPct[s] ?? 0;
    const deficit = target - current;
    if (deficit > worstDeficit) {
      worstDeficit = deficit;
      worstSymbol = s;
    }
  }

  if (worstDeficit <= 0) {
    // All ETFs are at or above target — split proportionally
    const parts: string[] = [];
    for (const s of symbols) {
      const pct = targetAlloc[s] ?? 0;
      const amount = (pct / 100) * fortnightlyAmount;
      parts.push(`${s} $${amount.toFixed(2)}`);
    }
    return {
      symbol: symbols[0],
      amount: fortnightlyAmount,
      reason: `All ETFs on target. Split proportionally: ${parts.join(", ")}`,
    };
  }

  return {
    symbol: worstSymbol,
    amount: fortnightlyAmount,
    reason: `${worstSymbol} is ${worstDeficit.toFixed(1)}% from target. Buy 100% ${worstSymbol} to rebalance.`,
  };
}
