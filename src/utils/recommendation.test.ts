import { describe, expect, it } from "vitest";
import { calculateBuyRecommendation } from "./recommendation";
import { Holding } from "../types";

describe("calculateBuyRecommendation", () => {
  it("recommends 100% to more underweight ETF when both are off-target", () => {
    const holdings: Holding[] = [
      {
        etf: "VAS",
        totalUnits: 50,
        totalCost: 5000,
        averageCost: 100,
        currentPrice: 110,
        currentValue: 5500,
        unrealizedGainLoss: 500,
        realizedGainLossTotal: 0,
        realizedShortTermGainLoss: 0,
        realizedLongTermGainLoss: 0,
      },
      {
        etf: "VGS",
        totalUnits: 100,
        totalCost: 8000,
        averageCost: 80,
        currentPrice: 85,
        currentValue: 8500,
        unrealizedGainLoss: 500,
        realizedGainLossTotal: 0,
        realizedShortTermGainLoss: 0,
        realizedLongTermGainLoss: 0,
      },
    ];

    // Target 40% VAS, 60% VGS
    // Current: 39.3% VAS, 60.7% VGS
    // VAS is more underweight
    const recommendation = calculateBuyRecommendation(holdings, 1000, { VAS: 40, VGS: 60 });

    expect(recommendation.symbol).toBe("VAS");
    expect(recommendation.amount).toBe(1000);
  });

  it("recommends 100% to VGS when it's more underweight", () => {
    const holdings: Holding[] = [
      {
        etf: "VAS",
        totalUnits: 100,
        totalCost: 10000,
        averageCost: 100,
        currentPrice: 110,
        currentValue: 11000,
        unrealizedGainLoss: 1000,
        realizedGainLossTotal: 0,
        realizedShortTermGainLoss: 0,
        realizedLongTermGainLoss: 0,
      },
      {
        etf: "VGS",
        totalUnits: 25,
        totalCost: 2000,
        averageCost: 80,
        currentPrice: 85,
        currentValue: 2125,
        unrealizedGainLoss: 125,
        realizedGainLossTotal: 0,
        realizedShortTermGainLoss: 0,
        realizedLongTermGainLoss: 0,
      },
    ];

    // Target 30% VAS, 70% VGS
    // Current: 83.8% VAS, 16.2% VGS
    // VGS is much more underweight
    const recommendation = calculateBuyRecommendation(holdings, 1000, { VAS: 30, VGS: 70 });

    expect(recommendation.symbol).toBe("VGS");
    expect(recommendation.amount).toBe(1000);
  });

  it("splits proportionally when both are exactly on target", () => {
    const holdings: Holding[] = [
      {
        etf: "VAS",
        totalUnits: 40,
        totalCost: 4000,
        averageCost: 100,
        currentPrice: 100,
        currentValue: 4000,
        unrealizedGainLoss: 0,
        realizedGainLossTotal: 0,
        realizedShortTermGainLoss: 0,
        realizedLongTermGainLoss: 0,
      },
      {
        etf: "VGS",
        totalUnits: 75,
        totalCost: 6000,
        averageCost: 80,
        currentPrice: 80,
        currentValue: 6000,
        unrealizedGainLoss: 0,
        realizedGainLossTotal: 0,
        realizedShortTermGainLoss: 0,
        realizedLongTermGainLoss: 0,
      },
    ];

    // Target 40% VAS, 60% VGS - exactly matched
    // Current: 4000/10000 = 40% VAS, 6000/10000 = 60% VGS
    const recommendation = calculateBuyRecommendation(holdings, 1000, { VAS: 40, VGS: 60 });

    expect(recommendation.symbol).toBe("VAS");
    expect(recommendation.reason).toContain("Split proportionally");
  });

  it("allocates all to most appropriate ETF when no holdings exist", () => {
    const holdings: Holding[] = [];

    // Target 30% VAS, 70% VGS
    const recommendation = calculateBuyRecommendation(holdings, 1000, { VAS: 30, VGS: 70 });

    expect(recommendation.symbol).toBe("VGS");
    expect(recommendation.amount).toBe(1000);
    expect(recommendation.reason).toContain("No holdings yet");
  });
});
