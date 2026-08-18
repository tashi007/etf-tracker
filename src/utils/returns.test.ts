import { describe, expect, it } from "vitest";

import { calculateReturnMetrics } from "./returns";
import { Dividend, Lot, Transaction } from "../types";

describe("calculateReturnMetrics", () => {
  it("calculates lump-sum returns over a one-year holding period", () => {
    const valuations = [
      { date: "2024-01-01", value: 100 },
      { date: "2025-01-01", value: 110 },
    ];
    const transactions: Transaction[] = [
      {
        id: "buy-1",
        date: "2024-01-01",
        etf: "VAS",
        type: "BUY",
        units: 1,
        pricePerUnit: 100,
      },
    ];

    const metrics = calculateReturnMetrics(valuations, transactions, [], "ITD");

    expect(metrics.timeWeightedReturn).toBeCloseTo(0.1, 6);
    expect(metrics.moneyWeightedReturn).toBeCloseTo(0.1, 3);
  });

  it("keeps periodic contributions neutral when the market is flat", () => {
    const valuations = [
      { date: "2024-01-01", value: 100 },
      { date: "2024-07-01", value: 200 },
      { date: "2025-01-01", value: 200 },
    ];
    const transactions: Transaction[] = [
      {
        id: "buy-1",
        date: "2024-01-01",
        etf: "VAS",
        type: "BUY",
        units: 1,
        pricePerUnit: 100,
      },
      {
        id: "buy-2",
        date: "2024-07-01",
        etf: "VAS",
        type: "BUY",
        units: 1,
        pricePerUnit: 100,
      },
    ];

    const metrics = calculateReturnMetrics(valuations, transactions, [], "ITD");

    expect(metrics.timeWeightedReturn).toBeCloseTo(0, 6);
    expect(metrics.moneyWeightedReturn).toBeCloseTo(0, 6);
  });

  it("captures sale gains over a one-year period", () => {
    const valuations = [
      { date: "2024-01-01", value: 100 },
      { date: "2025-01-01", value: 0 },
    ];
    const transactions: Transaction[] = [
      {
        id: "buy-1",
        date: "2024-01-01",
        etf: "VAS",
        type: "BUY",
        units: 1,
        pricePerUnit: 100,
      },
      {
        id: "sell-1",
        date: "2025-01-01",
        etf: "VAS",
        type: "SELL",
        units: 1,
        pricePerUnit: 120,
        disposalMethod: "FIFO",
      },
    ];

    const metrics = calculateReturnMetrics(valuations, transactions, [], "ITD");

    expect(metrics.timeWeightedReturn).toBeCloseTo(0.2, 6);
    expect(metrics.moneyWeightedReturn).toBeCloseTo(0.2, 3);
  });

  it("maps weekend contributions to the next trading day", () => {
    const valuations = [
      { date: "2024-01-05", value: 100 },
      { date: "2024-01-08", value: 210 },
      { date: "2025-01-05", value: 210 },
    ];
    const transactions: Transaction[] = [
      {
        id: "buy-weekend",
        date: "2024-01-06",
        etf: "VAS",
        type: "BUY",
        units: 1,
        pricePerUnit: 105,
      },
    ];

    const metrics = calculateReturnMetrics(valuations, transactions, [], "ITD");

    expect(metrics.timeWeightedReturn).toBeCloseTo(0.05, 6);
    expect(metrics.startDate).toBe("2024-01-05");
    expect(metrics.endDate).toBe("2025-01-05");
  });

  it("treats dividend reinvestment as offsetting cash flows", () => {
    const valuations = [
      { date: "2024-01-01", value: 100 },
      { date: "2025-01-01", value: 100 },
    ];
    const transactions: Transaction[] = [
      {
        id: "buy-1",
        date: "2024-01-01",
        etf: "VAS",
        type: "BUY",
        units: 1,
        pricePerUnit: 100,
      },
    ];
    const dividends: Dividend[] = [
      {
        id: "div-1",
        etf: "VAS",
        exDate: "2024-12-30",
        payDate: "2025-01-01",
        amountPerUnit: 10,
        unitsHeldAtExDate: 1,
      },
    ];
    const lots: Lot[] = [
      {
        id: "div-1-drp-1",
        symbol: "VAS",
        units: 0.1,
        costBasisPerUnit: 100,
        purchaseDate: "2025-01-01",
        linkedDividendId: "div-1",
      },
    ];

    const metrics = calculateReturnMetrics(
      valuations,
      transactions,
      dividends,
      "ITD",
      lots,
    );

    expect(metrics.timeWeightedReturn).toBeCloseTo(0, 6);
    expect(metrics.moneyWeightedReturn).toBeCloseTo(0, 6);
  });
});
