import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HoldingsTable } from "./HoldingsTable";
import { Holding, TargetAlloc } from "../types";

function holding(
  etf: string,
  currentValue: number,
  unrealized: number,
): Holding {
  return {
    etf,
    totalUnits: 100,
    totalCost: currentValue * 0.9,
    averageCost: currentValue * 0.009,
    currentPrice: currentValue / 100,
    currentValue,
    unrealizedGainLoss: unrealized,
    realizedGainLossTotal: 0,
    realizedShortTermGainLoss: 0,
    realizedLongTermGainLoss: 0,
  };
}

const targetAlloc: TargetAlloc = {
  alloc: { VAS: 50, VGS: 40 },
  driftTolerancePercent: 5,
};

describe("HoldingsTable", () => {
  it("renders rows with right-aligned numerics and drift pills", () => {
    const holdings = [
      holding("VAS", 4900, 100),
      holding("VGS", 5100, -200),
    ];
    render(
      <HoldingsTable
        holdings={holdings}
        targetAlloc={targetAlloc}
        enabledSymbols={["VAS", "VGS"]}
        pricesLastUpdated=""
      />,
    );
    expect(screen.getByText("VAS")).toBeTruthy();
    expect(screen.getByText("VGS")).toBeTruthy();
    expect(screen.getByText("$4,900.00")).toBeTruthy();
    expect(screen.getByText("IN")).toBeTruthy();
    expect(screen.getByText(/OUT/)).toBeTruthy();
  });

  it("shows the empty state when there are no holdings", () => {
    render(
      <HoldingsTable
        holdings={[]}
        targetAlloc={targetAlloc}
        enabledSymbols={["VAS"]}
        pricesLastUpdated=""
      />,
    );
    expect(screen.getByText("No holdings yet.")).toBeTruthy();
  });
});
