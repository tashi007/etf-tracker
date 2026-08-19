import { describe, it, expect } from "vitest";
import {
  loadStateFromSqlite,
  saveStateToSqlite,
  validateDatabaseBytes,
} from "./sqlite";
import { DEFAULT_STATE } from "./defaults";
import type { State } from "../types";

const SAMPLE_STATE: State = {
  ...DEFAULT_STATE,
  transactions: [
    {
      id: "tx1",
      date: "2025-01-05",
      etf: "VGS",
      type: "BUY",
      units: 10,
      pricePerUnit: 100,
      lotId: "lot1",
      realizedGain: 0,
      realizedShortTermGain: 0,
      realizedLongTermGain: 0,
    },
    {
      id: "tx2",
      date: "2025-02-01",
      etf: "VGS",
      type: "SELL",
      units: 4,
      pricePerUnit: 120,
      lotId: null,
      lotIds: ["lot1"],
      disposalMethod: "FIFO",
      realizedGain: 80,
      realizedShortTermGain: 80,
      realizedLongTermGain: 0,
    },
  ],
  lots: [
    {
      id: "lot1",
      symbol: "VGS",
      units: 6,
      costBasisPerUnit: 100,
      purchaseDate: "2025-01-05",
      notes: "initial buy",
    },
  ],
  dividends: [
    {
      id: "div1",
      etf: "VGS",
      exDate: "2025-03-15",
      payDate: "2025-04-01",
      amountPerUnit: 1.2,
      unitsHeldAtExDate: 6,
      frankingCredits: 0.3,
    },
  ],
  priceAlerts: [
    { id: "alert1", etf: "VGS", targetPrice: 150, above: true, triggered: false },
  ],
  reminderSchedules: [
    {
      id: "rem1",
      enabled: true,
      amount: 500,
      intervalDays: 14,
      nextTriggerAt: "2025-05-01T00:00:00.000Z",
    },
  ],
  etfConfigs: [
    { symbol: "VGS", yahooSymbol: "VGS.AX", name: "VGS", enabled: true },
    { symbol: "VAS", yahooSymbol: "VAS.AX", name: "VAS", enabled: false },
  ],
  fortnightlyTargetAlloc: { VGS: 60, VAS: 40 },
};

describe("sqlite storage engine", () => {
  it("round-trips a full state through exported bytes", async () => {
    const bytes = await saveStateToSqlite(SAMPLE_STATE);
    expect(bytes.byteLength).toBeGreaterThan(0);
    const loaded = await loadStateFromSqlite(bytes);
    expect(loaded).toEqual(SAMPLE_STATE);
  });

  it("round-trips an empty (default) state", async () => {
    const bytes = await saveStateToSqlite(DEFAULT_STATE);
    const loaded = await loadStateFromSqlite(bytes);
    expect(loaded).toEqual(DEFAULT_STATE);
  });

  it("keeps fortnightlyTargetAlloc undefined when absent", async () => {
    const state: State = {
      ...DEFAULT_STATE,
      fortnightlyTargetAlloc: undefined,
    };
    const bytes = await saveStateToSqlite(state);
    const loaded = await loadStateFromSqlite(bytes);
    expect(loaded.fortnightlyTargetAlloc).toBeUndefined();
  });

  it("rejects invalid bytes", async () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 99]);
    expect(await validateDatabaseBytes(junk)).toBe(false);
  });

  it("accepts a valid sqlite database", async () => {
    const bytes = await saveStateToSqlite(SAMPLE_STATE);
    expect(await validateDatabaseBytes(bytes)).toBe(true);
  });
});
