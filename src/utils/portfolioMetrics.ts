import { Dividend, Holding, Lot, Transaction } from "../types";
import { calculateCAGR, getFirstTransactionDate } from "./performance";
import {
  calculateReturnMetrics,
  DailyValuation,
  ReturnPeriod,
} from "./returns";

export interface PortfolioMetricsInputs {
  holdings: Holding[];
  transactions: Transaction[];
  dividends: Dividend[];
  lots: Lot[];
  portfolioHistory: DailyValuation[];
  totalInvested: number;
  totalCurrentValue: number;
  period: ReturnPeriod;
}

export interface PortfolioMetrics {
  totalInvested: number;
  totalCurrentValue: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  shortTermRealizedGainLoss: number;
  longTermRealizedGainLoss: number;
  totalDividends: number;
  cagr: number;
  totalReturnPct: number;
  timeWeightedReturn: number;
  moneyWeightedReturn: number;
}

export function computePortfolioMetrics(
  inputs: PortfolioMetricsInputs,
): PortfolioMetrics {
  const {
    holdings,
    transactions,
    dividends,
    lots,
    portfolioHistory,
    totalInvested,
    totalCurrentValue,
    period,
  } = inputs;

  const sum = (pick: (h: Holding) => number) =>
    holdings.reduce((acc, h) => acc + pick(h), 0);

  const overallGainLoss = totalCurrentValue - totalInvested;
  const overallReturnPct =
    totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0;
  const firstDate = getFirstTransactionDate(transactions || []);
  const cagr = calculateCAGR(totalInvested, totalCurrentValue, firstDate);
  const totalDividends = dividends.reduce(
    (sumD, d) => sumD + d.amountPerUnit * d.unitsHeldAtExDate,
    0,
  );
  const returnMetrics = calculateReturnMetrics(
    portfolioHistory,
    transactions,
    dividends,
    period,
    lots,
  );

  return {
    totalInvested,
    totalCurrentValue,
    unrealizedGainLoss: sum((h) => h.unrealizedGainLoss),
    realizedGainLoss: sum((h) => h.realizedGainLossTotal),
    shortTermRealizedGainLoss: sum((h) => h.realizedShortTermGainLoss),
    longTermRealizedGainLoss: sum((h) => h.realizedLongTermGainLoss),
    totalDividends,
    cagr,
    totalReturnPct: overallReturnPct,
    timeWeightedReturn: returnMetrics.timeWeightedReturn,
    moneyWeightedReturn: returnMetrics.moneyWeightedReturn,
  };
}
