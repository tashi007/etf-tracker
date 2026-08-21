import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiGrid } from "./KpiGrid";
import { PortfolioMetrics } from "../utils/portfolioMetrics";

const metrics: PortfolioMetrics = {
  totalInvested: 1500,
  totalCurrentValue: 1650,
  unrealizedGainLoss: 150,
  realizedGainLoss: 40,
  shortTermRealizedGainLoss: 10,
  longTermRealizedGainLoss: 30,
  totalDividends: 200,
  cagr: 0.08,
  totalReturnPct: 10,
  timeWeightedReturn: 0.05,
  moneyWeightedReturn: -0.02,
};

describe("KpiGrid", () => {
  it("renders the six hero KPIs and five secondary stats", () => {
    render(<KpiGrid metrics={metrics} period="1Y" />);
    for (const label of [
      "Total Invested",
      "Current Value",
      "Unrealized P&L",
      "TWR",
      "MWR",
      "CAGR",
      "Realized P&L",
      "Short-term Realized",
      "Long-term Realized",
      "Dividends Received",
      "Total Return",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getAllByText("1Y").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("$1,500.00")).toBeTruthy();
    expect(screen.getByText("5.00%")).toBeTruthy();
  });

  it("colors negative values with the loss tone", () => {
    render(<KpiGrid metrics={metrics} period="1Y" />);
    const mwr = screen.getByText("-2.00%");
    expect(mwr.className).toContain("text-rose-600");
  });
});
