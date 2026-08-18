import Dexie, { type Table } from "dexie";
import type {
  Dividend,
  EtfConfig,
  ReminderSchedule,
  PriceAlert,
  State,
  TargetAlloc,
  Lot,
  Transaction,
} from "../types";
import { DEFAULT_ETF_SYMBOLS } from "../types";
import { buildLotsFromTransactions } from "../utils/lots";
import {
  DEFAULT_ETFS,
  DEFAULT_STATE,
  getDefaultTargetAlloc,
  getEnabledSymbols,
} from "./defaults";
export { DEFAULT_ETFS, DEFAULT_STATE, getDefaultTargetAlloc, getEnabledSymbols };

export const PORTFOLIO_DB_NAME = "ETFPortfolio";
export const CURRENT_SCHEMA_VERSION = 5;
export const LEGACY_STORAGE_KEY = "etf-tracker";

export interface TransactionRecord extends Transaction {
  lotId: string | null;
}

export interface TargetAllocRecord extends TargetAlloc {
  id: number;
  fortnightlyTargetAlloc?: Record<string, number>;
}

export type LotRecord = Lot;

export interface PriceSnapshotRecord {
  id: string;
  symbol: string;
  price: number;
  change: number;
  capturedAt: string;
}

export interface SchemaVersionRecord {
  id: number;
  version: number;
}

export interface PortfolioDbState {
  transactions: TransactionRecord[];
  lots: LotRecord[];
  dividends: Dividend[];
  targetAlloc: TargetAlloc;
  priceAlerts: PriceAlert[];
  reminderSchedules: ReminderSchedule[];
  etfConfigs: EtfConfig[];
  fortnightlyTargetAlloc: Record<string, number>;
}

class ETFPortfolioDatabase extends Dexie {
  transactions!: Table<TransactionRecord, string>;
  lots!: Table<LotRecord, string>;
  dividends!: Table<Dividend, string>;
  targetAlloc!: Table<TargetAllocRecord, number>;
  priceAlerts!: Table<PriceAlert, string>;
  reminderSchedules!: Table<ReminderSchedule, string>;
  priceSnapshots!: Table<PriceSnapshotRecord, string>;
  schemaVersion!: Table<SchemaVersionRecord, number>;
  etfConfigs!: Table<EtfConfig, string>;

  constructor() {
    super(PORTFOLIO_DB_NAME);
    this.version(CURRENT_SCHEMA_VERSION).stores({
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
  }
}

export const db = new ETFPortfolioDatabase();

function normalizeState(
  input: Partial<State> & { transactions?: Transaction[] },
): PortfolioDbState {
  const etfConfigs = input.etfConfigs ?? DEFAULT_ETFS;
  const baseAlloc = getDefaultTargetAlloc(etfConfigs);
  const targetAlloc: TargetAlloc = {
    ...baseAlloc,
    ...(input.targetAlloc ?? {}),
    alloc: { ...baseAlloc.alloc, ...(input.targetAlloc?.alloc ?? {}) },
  };

  return {
    transactions: (input.transactions ?? []).map((tx) => ({
      ...tx,
      lotId: tx.lotId ?? null,
    })),
    lots: input.lots ?? buildLotsFromTransactions(input.transactions ?? []),
    dividends: input.dividends ?? [],
    targetAlloc,
    priceAlerts: input.priceAlerts ?? [],
    reminderSchedules: input.reminderSchedules ?? [],
    etfConfigs,
    fortnightlyTargetAlloc:
      input.fortnightlyTargetAlloc ??
      DEFAULT_STATE.fortnightlyTargetAlloc ?? { VAS: 40, VGS: 60 },
  };
}

async function isDatabaseEmpty(): Promise<boolean> {
  const counts = await Promise.all([
    db.transactions.count(),
    db.lots.count(),
    db.dividends.count(),
    db.targetAlloc.count(),
    db.priceAlerts.count(),
    db.priceSnapshots.count(),
    db.etfConfigs.count(),
  ]);
  return counts.every((count) => count === 0);
}

export async function loadState(): Promise<State> {
  await db.open();
  const [
    transactions,
    lots,
    dividends,
    targetAllocRows,
    priceAlerts,
    reminderSchedules,
    etfConfigs,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.lots.toArray(),
    db.dividends.toArray(),
    db.targetAlloc.toArray(),
    db.priceAlerts.toArray(),
    db.reminderSchedules.toArray(),
    db.etfConfigs.toArray(),
  ]);

  const configs =
    etfConfigs.length > 0
      ? etfConfigs
      : DEFAULT_ETFS;

  const targetAllocRow = targetAllocRows[0];
  const defaultAlloc = getDefaultTargetAlloc(configs);

  const targetAlloc: TargetAlloc = targetAllocRow
    ? {
        alloc: { ...defaultAlloc.alloc, ...(targetAllocRow.alloc ?? {}) },
        holdingPeriodDays:
          targetAllocRow.holdingPeriodDays ??
          defaultAlloc.holdingPeriodDays,
        driftTolerancePercent:
          targetAllocRow.driftTolerancePercent ??
          defaultAlloc.driftTolerancePercent,
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
      targetAllocRow?.fortnightlyTargetAlloc ??
      DEFAULT_STATE.fortnightlyTargetAlloc ?? { VAS: 40, VGS: 60 },
  };
}

export async function saveState(state: State): Promise<void> {
  await db.open();
  const normalized = normalizeState(state);

  await db.transactions.clear();
  await db.lots.clear();
  await db.dividends.clear();
  await db.targetAlloc.clear();
  await db.priceAlerts.clear();
  await db.reminderSchedules.clear();
  await db.etfConfigs.clear();

  await db.transactions.bulkPut(normalized.transactions);
  await db.lots.bulkPut(normalized.lots);
  await db.dividends.bulkPut(normalized.dividends);
  await db.targetAlloc.put({
    id: 1,
    ...normalized.targetAlloc,
    fortnightlyTargetAlloc: normalized.fortnightlyTargetAlloc,
  });
  await db.priceAlerts.bulkPut(normalized.priceAlerts);
  await db.reminderSchedules.bulkPut(normalized.reminderSchedules);
  await db.etfConfigs.bulkPut(normalized.etfConfigs);

  await db.schemaVersion.put({ id: 1, version: CURRENT_SCHEMA_VERSION });
}

export async function migrate(): Promise<boolean> {
  await db.open();

  const existingVersion = await db.schemaVersion.get(1);
  const databaseEmpty = await isDatabaseEmpty();

  if (existingVersion?.version === CURRENT_SCHEMA_VERSION && !databaseEmpty) {
    return false;
  }

  if (!databaseEmpty && existingVersion?.version === undefined) {
    await db.schemaVersion.put({ id: 1, version: CURRENT_SCHEMA_VERSION });
    return false;
  }

  // Migrate v4 -> v5: convert flat TargetAlloc to alloc Record,
  // convert fortnightlyTargetVgsPercent to fortnightlyTargetAlloc,
  // seed etfConfigs
  if (existingVersion && existingVersion.version < 5) {
    const existingConfigs = await db.etfConfigs.toArray();
    if (existingConfigs.length === 0) {
      await db.etfConfigs.bulkPut(DEFAULT_ETFS);
    }

    const existingAllocRows = await db.targetAlloc.toArray();
    if (existingAllocRows.length > 0) {
      const old = existingAllocRows[0];
      const vgsPct = (old as unknown as Record<string, number>)
        .fortnightlyTargetVgsPercent ?? 60;
      const newAlloc: Record<string, number> = {};
      for (const symbol of DEFAULT_ETF_SYMBOLS) {
        newAlloc[symbol] =
          (old as unknown as Record<string, number>)[symbol] ?? 0;
      }
      await db.targetAlloc.clear();
      await db.targetAlloc.put({
        id: 1,
        alloc: newAlloc,
        holdingPeriodDays: old.holdingPeriodDays ?? 365,
        driftTolerancePercent: old.driftTolerancePercent ?? 5,
        fortnightlyTargetAlloc: { VAS: 100 - vgsPct, VGS: vgsPct },
      });
    }
  }

  const existingLots = await db.lots.count();
  if (existingLots === 0) {
    const existingTransactions = await db.transactions.toArray();
    const derivedLots = existingTransactions
      .filter((tx) => tx.type === "BUY")
      .map((tx) => ({
        id: tx.lotId ?? tx.id,
        symbol: tx.etf,
        units: tx.units,
        costBasisPerUnit: tx.pricePerUnit,
        purchaseDate: tx.date,
        originalTransactionId: tx.id,
      }));
    if (derivedLots.length > 0) {
      await db.lots.bulkPut(derivedLots);
    }
  }

  const legacyRaw =
    typeof window !== "undefined"
      ? window.localStorage.getItem(LEGACY_STORAGE_KEY)
      : null;
  if (!legacyRaw) {
    await db.schemaVersion.put({ id: 1, version: CURRENT_SCHEMA_VERSION });
    return false;
  }

  try {
    const legacyParsed = JSON.parse(legacyRaw) as Partial<State> & {
      transactions?: Transaction[];
    };
    const legacyState = normalizeState(legacyParsed);

    await db.transactions.clear();
    await db.lots.clear();
    await db.dividends.clear();
    await db.targetAlloc.clear();
    await db.priceAlerts.clear();
    await db.reminderSchedules.clear();

    await db.transactions.bulkPut(legacyState.transactions);
    await db.lots.bulkPut(
      legacyState.transactions
        .filter((tx) => tx.type === "BUY")
        .map((tx) => ({
          id: tx.lotId ?? tx.id,
          symbol: tx.etf,
          units: tx.units,
          costBasisPerUnit: tx.pricePerUnit,
          purchaseDate: tx.date,
          originalTransactionId: tx.id,
        })),
    );
    await db.dividends.bulkPut(legacyState.dividends);
    await db.targetAlloc.put({ id: 1, ...legacyState.targetAlloc });
    await db.priceAlerts.bulkPut(legacyState.priceAlerts);
    await db.reminderSchedules.bulkPut(legacyState.reminderSchedules ?? []);
    await db.etfConfigs.bulkPut(legacyState.etfConfigs);

    await db.schemaVersion.put({ id: 1, version: CURRENT_SCHEMA_VERSION });

    return true;
  } catch (error) {
    console.error("Failed to migrate legacy portfolio data", error);
    await db.schemaVersion.put({ id: 1, version: CURRENT_SCHEMA_VERSION });
    return false;
  }
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
    const imported = JSON.parse(jsonString) as Partial<State> & {
      transactions?: Transaction[];
    };

    if (
      imported.transactions === undefined ||
      imported.targetAlloc === undefined
    ) {
      return false;
    }

    await saveState({
      ...DEFAULT_STATE,
      ...imported,
      lots: (imported as State & { lots?: Lot[] }).lots ?? [],
      etfConfigs: (imported as State & { etfConfigs?: EtfConfig[] }).etfConfigs ?? DEFAULT_ETFS,
      reminderSchedules:
        (imported as State & { reminderSchedules?: ReminderSchedule[] })
          .reminderSchedules ?? [],
      transactions: imported.transactions.map((tx) => ({
        ...tx,
        lotId: tx.lotId ?? null,
      })),
      dividends: imported.dividends ?? [],
      priceAlerts: imported.priceAlerts ?? [],
    });

    return true;
  } catch (error) {
    console.error("Failed to import portfolio data", error);
    return false;
  }
}
