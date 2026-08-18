import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import {
  loadState,
  saveState,
  getData,
  exportDatabaseBytes,
  importDatabaseBytes,
  migrate,
} from "./db";
import { DEFAULT_STATE } from "./defaults";
import type { State } from "../types";

describe("db facade", () => {
  const state: State = {
    ...DEFAULT_STATE,
    targetAlloc: { ...DEFAULT_STATE.targetAlloc },
  };

  beforeEach(async () => {
    await Dexie.delete("ETFPortfolioVault");
    await Dexie.delete("ETFPortfolio");
  });

  it("returns default state when nothing stored", async () => {
    const data = await getData();
    expect(data.transactions).toEqual([]);
    expect(data.etfConfigs.length).toBeGreaterThan(0);
  });

  it("saves and reloads via the vault", async () => {
    const modified: State = {
      ...state,
      transactions: [
        { id: "t1", date: "2025-01-01", etf: "VGS", type: "BUY", units: 3, pricePerUnit: 100 },
      ],
    };
    await saveState(modified);
    const loaded = await loadState();
    expect(loaded.transactions).toEqual(modified.transactions);
  });

  it("importDatabaseBytes rejects corrupt bytes and keeps data untouched", async () => {
    await saveState(state);
    const ok = await importDatabaseBytes(new Uint8Array([1, 2, 3, 4, 66]));
    expect(ok).toBe(false);
    const after = await loadState();
    expect(after).toEqual(state);
  });

  it("exportDatabaseBytes then importDatabaseBytes round-trips", async () => {
    const modified: State = {
      ...state,
      priceAlerts: [{ id: "a1", etf: "VGS", targetPrice: 200, above: true, triggered: false }],
    };
    await saveState(modified);
    const bytes = await exportDatabaseBytes();
    const good = await importDatabaseBytes(bytes);
    expect(good).toBe(true);
    const reloaded = await loadState();
    expect(reloaded.priceAlerts).toEqual(modified.priceAlerts);
  });

  it("one-time legacy migration copies dexie rows into sqlite", async () => {
    const legacy = new Dexie("ETFPortfolio");
    // Must declare the exact schema readLegacyDexieState() opens, otherwise
    // Dexie throws VersionError/SchemaError on open.
    legacy.version(5).stores({
      transactions: "id,date,etf,type,lotId",
      lots: "id,symbol,purchaseDate",
      dividends: "id,etf,exDate,payDate",
      targetAlloc: "id",
      priceAlerts: "id,etf,triggered",
      reminderSchedules: "id,enabled,nextTriggerAt",
      priceSnapshots: "id,symbol,capturedAt",
      schemaVersion: "id",
      etfConfigs: "symbol",
    });
    await legacy.table("transactions").put({
      id: "legacy1",
      date: "2024-12-01",
      etf: "VAS",
      type: "BUY",
      units: 1,
      pricePerUnit: 50,
      lotId: null,
    });
    await legacy.table("etfConfigs").put({
      symbol: "VAS",
      yahooSymbol: "VAS.AX",
      name: "VAS",
      enabled: true,
    });

    const fine = await migrate();
    expect(fine).toBe(true);

    const data = await getData();
    expect(data.transactions.some((t) => t.id === "legacy1")).toBe(true);
    expect(data.etfConfigs).toContainEqual(
      expect.objectContaining({ symbol: "VAS" }),
    );

    // idempotent: second run leaves data unchanged (blob already populated)
    await migrate();
    const again = await getData();
    expect(again.transactions).toEqual(data.transactions);
    await legacy.delete();
  });
});
