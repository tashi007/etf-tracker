import Dexie from "dexie";
import type {
  Dividend,
  EtfConfig,
  Lot,
  PriceAlert,
  ReminderSchedule,
  State,
  TargetAlloc,
  Transaction,
} from "../types";
import {
  loadStateFromSqlite,
  saveStateToSqlite,
  validateDatabaseBytes,
} from "./sqlite";
import { getVaultBytes, setVaultBytes } from "./vault";
import {
  DEFAULT_ETFS,
  DEFAULT_STATE,
  getDefaultTargetAlloc,
  getEnabledSymbols,
} from "./defaults";

export {
  DEFAULT_ETFS,
  DEFAULT_STATE,
  getDefaultTargetAlloc,
  getEnabledSymbols,
};

export const PORTFOLIO_DB_NAME = "ETFPortfolio";
export const CURRENT_SCHEMA_VERSION = 5;
export const LEGACY_STORAGE_KEY = "etf-tracker";

interface TransactionRecord extends Transaction {
  lotId: string | null;
}

interface TargetAllocRecord extends TargetAlloc {
  id: number;
  fortnightlyTargetAlloc?: Record<string, number>;
}

function stripNullLotIds(transactions: Transaction[]): Transaction[] {
  return transactions.map((tx) => {
    if (tx.lotId !== null) return tx;
    const clean: Transaction = { ...tx };
    delete clean.lotId;
    return clean;
  });
}

export async function loadState(): Promise<State> {
  const bytes = await getVaultBytes();
  if (!bytes) return DEFAULT_STATE;
  try {
    const state = await loadStateFromSqlite(bytes);
    return {
      ...state,
      transactions: stripNullLotIds(state.transactions),
    };
  } catch (e) {
    console.error("SQLite load failed", e);
    return DEFAULT_STATE;
  }
}

export async function saveState(state: State): Promise<void> {
  const bytes = await saveStateToSqlite(state);
  await setVaultBytes(bytes);
}

export async function exportDatabaseBytes(): Promise<Uint8Array> {
  const state = await loadState();
  return saveStateToSqlite(state);
}

export async function importDatabaseBytes(bytes: Uint8Array): Promise<boolean> {
  if (!(await validateDatabaseBytes(bytes))) return false;
  await setVaultBytes(bytes);
  return true;
}

export async function migrate(): Promise<boolean> {
  const existingBlob = await getVaultBytes();
  if (existingBlob) return true; // already on SQLite — idempotent no-op
  try {
    const legacyJson = localStorage.getItem(LEGACY_STORAGE_KEY); // pre-Dexie "etf-tracker" JSON key
    let next: State;
    if (legacyJson) {
      next = JSON.parse(legacyJson) as State;
    } else {
      next = await readLegacyDexieState(); // map rows from old Dexie tables
    }
    await setVaultBytes(await saveStateToSqlite(next));
    return true;
  } catch (e) {
    console.error("Legacy migration failed", e);
    return false;
  }
}

async function readLegacyDexieState(): Promise<State> {
  const legacy = new Dexie(PORTFOLIO_DB_NAME);
  legacy.version(CURRENT_SCHEMA_VERSION).stores({
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

  const transactions = (
    await legacy.table<TransactionRecord, string>("transactions").toArray()
  ).map((tx) => ({ ...tx, lotId: tx.lotId ?? null }));
  const lots = await legacy.table<Lot, string>("lots").toArray();
  const dividends = await legacy
    .table<Dividend, string>("dividends")
    .toArray();
  const priceAlerts = await legacy
    .table<PriceAlert, string>("priceAlerts")
    .toArray();
  const reminderSchedules = await legacy
    .table<ReminderSchedule, string>("reminderSchedules")
    .toArray();
  const etfConfigs = await legacy
    .table<EtfConfig, string>("etfConfigs")
    .toArray();
  const targetAllocRows = await legacy
    .table<TargetAllocRecord, number>("targetAlloc")
    .toArray();

  const configs = etfConfigs.length > 0 ? etfConfigs : DEFAULT_ETFS;
  const defaultAlloc = getDefaultTargetAlloc(configs);
  const targetAllocRow = targetAllocRows[0];

  const targetAlloc: TargetAlloc = targetAllocRow
    ? {
        alloc: { ...defaultAlloc.alloc, ...(targetAllocRow.alloc ?? {}) },
        holdingPeriodDays:
          targetAllocRow.holdingPeriodDays ?? defaultAlloc.holdingPeriodDays,
        driftTolerancePercent:
          targetAllocRow.driftTolerancePercent ?? defaultAlloc.driftTolerancePercent,
      }
    : defaultAlloc;

  return {
    transactions,
    lots,
    dividends,
    targetAlloc,
    priceAlerts,
    reminderSchedules,
    etfConfigs: configs,
    fortnightlyTargetAlloc:
      targetAllocRow?.fortnightlyTargetAlloc ?? DEFAULT_STATE.fortnightlyTargetAlloc,
  };
}

export async function getData(): Promise<State> {
  return loadState();
}

export async function setData(state: State): Promise<void> {
  await saveState(state);
}

export async function exportState(): Promise<string> {
  const state = await loadState();
  return JSON.stringify(state, null, 2);
}

export async function importState(jsonString: string): Promise<boolean> {
  try {
    const imported = JSON.parse(jsonString) as Partial<State>;
    if (
      imported.transactions === undefined ||
      imported.targetAlloc === undefined
    ) {
      return false;
    }
    const merged: State = {
      ...DEFAULT_STATE,
      ...imported,
      lots: imported.lots ?? [],
      etfConfigs: imported.etfConfigs ?? DEFAULT_ETFS,
      reminderSchedules: imported.reminderSchedules ?? [],
      transactions: imported.transactions.map((tx) => ({
        ...tx,
        lotId: tx.lotId ?? null,
      })),
      dividends: imported.dividends ?? [],
      priceAlerts: imported.priceAlerts ?? [],
    };
    await setVaultBytes(await saveStateToSqlite(merged));
    return true;
  } catch (e) {
    console.error("Failed to import portfolio data", e);
    return false;
  }
}
