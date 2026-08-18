import { describe, it, expect } from "vitest";
import { calculateHoldings } from "./holdings";
import { Transaction } from "../types";

describe("calculateHoldings", () => {
  it("should correctly calculate holdings after a buy", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: "2025-01-01",
        etf: "VGS",
        type: "BUY",
        units: 10,
        pricePerUnit: 100,
      },
    ];
    const currentPrices = { VGS: 110 };
    const holdings = calculateHoldings(transactions, currentPrices, [], ["VGS"]);
    const vgs = holdings.find((h) => h.etf === "VGS");
    expect(vgs?.totalUnits).toBe(10);
    expect(vgs?.totalCost).toBe(1000);
    expect(vgs?.currentValue).toBe(1100);
  });

  it("should handle sell correctly", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: "2025-01-01",
        etf: "VGS",
        type: "BUY",
        units: 10,
        pricePerUnit: 100,
      },
      {
        id: "2",
        date: "2025-02-01",
        etf: "VGS",
        type: "SELL",
        units: 5,
        pricePerUnit: 120,
        realizedGain: 100,
      },
    ];
    const currentPrices = { VGS: 120 };
    const holdings = calculateHoldings(transactions, currentPrices, [], ["VGS"]);
    const vgs = holdings.find((h) => h.etf === "VGS");
    expect(vgs?.totalUnits).toBe(5);
    expect(vgs?.totalCost).toBe(500);
    expect(vgs?.unrealizedGainLoss).toBe(100);
    expect(vgs?.realizedGainLossTotal).toBe(100);
  });
});
