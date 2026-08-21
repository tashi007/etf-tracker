import { describe, it, expect } from "vitest";
import { computePortfolioMetrics } from "./portfolioMetrics";
import { Holding, Dividend, Lot, Transaction } from "../types";
import { DailyValuation } from "./returns";

const emptyHoldings: Holding[] = [];
const emptyTransactions: Transaction[] = [];
const emptyDividends: Dividend[] = [];
const emptyLots: Lot[] = [];
const emptyHistory: DailyValuation[] = [];

describe("computePortfolioMetrics", () => {
  it("returns zeros for empty inputs", () => {
    const m = computePortfolioMetrics({
      holdings: emptyHoldings,
      transactions: emptyTransactions,
      dividends: emptyDividends,
      lots: emptyLots,
      portfolioHistory: emptyHistory,
      totalInvested: 0,
      totalCurrentValue: 0,
      period: "1Y",
    });
    expect(m.totalInvested).toBe(0);
    expect(m.unrealizedGainLoss).toBe(0);
    expect(m.realizedGainLoss).toBe(0);
    expect(m.shortTermRealizedGainLoss).toBe(0);
    expect(m.longTermRealizedGainLoss).toBe(0);
    expect(m.totalDividends).toBe(0);
    expect(m.cagr).toBe(0);
    expect(m.totalReturnPct).toBe(0);
    expect(typeof m.timeWeightedReturn).toBe("number");
    expect(typeof m.moneyWeightedReturn).toBe("number");
  });

  it("aggregates holding P&L, dividends and total return", () => {
    const holdings: Holding[] = [
      {
        etf: "VAS",
        totalUnits: 100,
        totalCost: 1000,
        averageCost: 10,
        currentPrice: 12,
        currentValue: 1200,
        unrealizedGainLoss: 200,
        realizedGainLossTotal: 50,
        realizedShortTermGainLoss: 20,
        realizedLongTermGainLoss: 30,
      },
      {
        etf: "VGS",
        totalUnits: 50,
        totalCost: 500,
        averageCost: 10,
        currentPrice: 9,
        currentValue: 450,
        unrealizedGainLoss: -50,
        realizedGainLossTotal: -10,
        realizedShortTermGainLoss: -10,
        realizedLongTermGainLoss: 0,
      },
    ];
    const dividends: Dividend[] = [
      {
        id: "d1",
        etf: "VAS",
        exDate: "2026-01-01",
        payDate: "2026-01-14",
        amountPerUnit: 2,
        unitsHeldAtExDate: 100,
      },
    ];
    const m = computePortfolioMetrics({
      holdings,
      transactions: emptyTransactions,
      dividends,
      lots: emptyLots,
      portfolioHistory: emptyHistory,
      totalInvested: 1500,
      totalCurrentValue: 1650,
      period: "ITD",
    });
    expect(m.unrealizedGainLoss).toBe(150);
    expect(m.realizedGainLoss).toBe(40);
    expect(m.shortTermRealizedGainLoss).toBe(10);
    expect(m.longTermRealizedGainLoss).toBe(30);
    expect(m.totalDividends).toBe(200);
    expect(m.totalInvested).toBe(1500);
    expect(m.totalCurrentValue).toBe(1650);
    expect(m.totalReturnPct).toBeCloseTo(10, 5);
  });
});
