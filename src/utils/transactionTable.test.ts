import { describe, it, expect } from "vitest";
import {
  filterTransactions,
  paginateTransactions,
  sortTransactions,
  transactionAmount,
} from "./transactionTable";
import { Transaction } from "../types";

const txs: Transaction[] = [
  { id: "1", date: "2026-01-15", etf: "VAS", type: "BUY", units: 10, pricePerUnit: 100 },
  { id: "2", date: "2026-03-01", etf: "VGS", type: "SELL", units: 5, pricePerUnit: 200, realizedGain: 50 },
  { id: "3", date: "2025-12-30", etf: "NDQ", type: "BUY", units: 2, pricePerUnit: 50 },
];

describe("transactionAmount", () => {
  it("multiplies units by price", () => {
    expect(transactionAmount(txs[0])).toBe(1000);
  });
});

describe("filterTransactions", () => {
  it("matches etf case-insensitively", () => {
    expect(filterTransactions(txs, "vas").map((t) => t.id)).toEqual(["1"]);
  });
  it("matches type", () => {
    expect(filterTransactions(txs, "sell").map((t) => t.id)).toEqual(["2"]);
  });
  it("matches date substring", () => {
    expect(filterTransactions(txs, "2026-03").map((t) => t.id)).toEqual(["2"]);
  });
  it("returns everything for blank search", () => {
    expect(filterTransactions(txs, "  ")).toHaveLength(3);
  });
});

describe("sortTransactions", () => {
  it("sorts by date ascending and flips for desc", () => {
    const asc = sortTransactions(txs, "date", "asc").map((t) => t.id);
    expect(asc).toEqual(["3", "1", "2"]);
    const desc = sortTransactions(txs, "date", "desc").map((t) => t.id);
    expect(desc).toEqual(["2", "1", "3"]);
  });
  it("sorts by amount", () => {
    expect(sortTransactions(txs, "amount", "asc").map((t) => t.id)).toEqual([
      "3",
      "1",
      "2",
    ]);
  });
  it("treats missing realizedGain as lowest", () => {
    expect(sortTransactions(txs, "realizedGain", "asc").map((t) => t.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
  });
});

describe("paginateTransactions", () => {
  it("pages at pageSize", () => {
    const p1 = paginateTransactions(txs, 1, 2);
    expect(p1.rows.map((t) => t.id)).toEqual(["1", "2"]);
    expect(p1.pageCount).toBe(2);
    const p2 = paginateTransactions(txs, 2, 2);
    expect(p2.rows.map((t) => t.id)).toEqual(["3"]);
  });
  it("clamps out-of-range pages", () => {
    expect(paginateTransactions(txs, 99, 2).rows.map((t) => t.id)).toEqual(["3"]);
    expect(paginateTransactions(txs, 0, 2).rows.map((t) => t.id)).toEqual(["1", "2"]);
  });
  it("returns everything when pageSize is all", () => {
    const p = paginateTransactions(txs, 1, "all");
    expect(p.rows).toHaveLength(3);
    expect(p.pageCount).toBe(1);
  });
});
