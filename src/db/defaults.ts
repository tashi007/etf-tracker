import type { EtfConfig, State, TargetAlloc } from "../types";
import { DEFAULT_ETF_SYMBOLS } from "../types";

export const DEFAULT_ETFS: EtfConfig[] = DEFAULT_ETF_SYMBOLS.map((symbol) => ({
  symbol,
  yahooSymbol: `${symbol}.AX`,
  name: symbol,
  enabled: true,
}));

export function getDefaultTargetAlloc(etfs: EtfConfig[]): TargetAlloc {
  const alloc: Record<string, number> = {};
  for (const etf of etfs) {
    alloc[etf.symbol] = 0;
  }
  // Seed defaults for the original 5
  if (alloc["VAS"] !== undefined) alloc["VAS"] = 30;
  if (alloc["VGS"] !== undefined) alloc["VGS"] = 60;
  if (alloc["VGE"] !== undefined) alloc["VGE"] = 5;
  if (alloc["VISM"] !== undefined) alloc["VISM"] = 5;
  if (alloc["NDQ"] !== undefined) alloc["NDQ"] = 0;
  return { alloc, holdingPeriodDays: 365, driftTolerancePercent: 5 };
}

export const DEFAULT_STATE: State = {
  transactions: [],
  lots: [],
  targetAlloc: getDefaultTargetAlloc(DEFAULT_ETFS),
  dividends: [],
  priceAlerts: [],
  reminderSchedules: [],
  etfConfigs: DEFAULT_ETFS,
  fortnightlyTargetAlloc: { VAS: 40, VGS: 60 },
};

export function getEnabledSymbols(etfConfigs: EtfConfig[]): string[] {
  return etfConfigs.filter((e) => e.enabled).map((e) => e.symbol);
}
