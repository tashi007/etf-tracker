import { describe, it, expect } from "vitest";
import { filterHistoryByPeriod } from "./historyRange";
import { DailyValuation } from "./returns";

const history: DailyValuation[] = [
  { date: "2020-01-02", value: 100 },
  { date: "2026-06-15", value: 200 },
  { date: "2026-07-21", value: 210 },
  { date: "2026-08-19", value: 220 },
];

describe("filterHistoryByPeriod", () => {
  it("returns the full series for ITD", () => {
    expect(filterHistoryByPeriod(history, "ITD", "2026-08-20")).toEqual(history);
  });

  it("filters to points inside the 1M window", () => {
    const filtered = filterHistoryByPeriod(history, "1M", "2026-08-20");
    expect(filtered.map((p) => p.date)).toEqual(["2026-07-21", "2026-08-19"]);
  });

  it("filters to points inside the 5Y window", () => {
    const filtered = filterHistoryByPeriod(history, "5Y", "2026-08-20");
    expect(filtered.map((p) => p.date)).toEqual([
      "2026-06-15",
      "2026-07-21",
      "2026-08-19",
    ]);
  });

  it("returns empty for empty history", () => {
    expect(filterHistoryByPeriod([], "1Y", "2026-08-20")).toEqual([]);
  });
});
