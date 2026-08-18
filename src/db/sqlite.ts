import initSqlJs from "sql.js";
import type { SqlJsStatic } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
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

function isNode(): boolean {
  return typeof process !== "undefined" && process.versions?.node !== undefined;
}

async function loadWasmBinaryFromDisk(): Promise<ArrayBuffer> {
  const { createRequire } = await import("node:module");
  const { readFileSync } = await import("node:fs");
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
  const binary = readFileSync(wasmPath);
  return binary.buffer.slice(
    binary.byteOffset,
    binary.byteOffset + binary.byteLength,
  ) as ArrayBuffer;
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

export async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      if (isNode()) {
        return initSqlJs({ wasmBinary: await loadWasmBinaryFromDisk() });
      }
      return initSqlJs({ locateFile: () => sqlWasmUrl });
    })();
  }
  return sqlJsPromise;
}

const SQLITE_SCHEMA_VERSION = 1;

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  etf TEXT NOT NULL,
  type TEXT NOT NULL,
  units REAL NOT NULL,
  pricePerUnit REAL NOT NULL,
  realizedGain REAL,
  lotId TEXT,
  lotIds TEXT,
  disposalMethod TEXT,
  realizedShortTermGain REAL,
  realizedLongTermGain REAL
);
CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  units REAL NOT NULL,
  costBasisPerUnit REAL NOT NULL,
  purchaseDate TEXT NOT NULL,
  notes TEXT,
  originalTransactionId TEXT,
  linkedDividendId TEXT
);
CREATE TABLE IF NOT EXISTS dividends (
  id TEXT PRIMARY KEY,
  etf TEXT NOT NULL,
  exDate TEXT NOT NULL,
  payDate TEXT NOT NULL,
  amountPerUnit REAL NOT NULL,
  unitsHeldAtExDate REAL NOT NULL,
  frankingCredits REAL
);
CREATE TABLE IF NOT EXISTS price_alerts (
  id TEXT PRIMARY KEY,
  etf TEXT NOT NULL,
  targetPrice REAL NOT NULL,
  above INTEGER NOT NULL,
  triggered INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  amount REAL NOT NULL,
  intervalDays INTEGER NOT NULL,
  nextTriggerAt TEXT NOT NULL,
  lastTriggeredAt TEXT
);
CREATE TABLE IF NOT EXISTS etf_configs (
  symbol TEXT PRIMARY KEY,
  yahooSymbol TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function queryRows(db: import("sql.js").Database, sql: string): Record<string, string | number | null>[] {
  const results = db.exec(sql);
  if (results.length === 0) return [];
  const { columns, values } = results[0];
  return values.map((row) => {
    const obj: Record<string, string | number | null> = {};
    columns.forEach((col, i) => {
      obj[col] = typeof row[i] === "string" || row[i] === null || typeof row[i] === "number" ? (row[i] as string | number | null) : null;
    });
    return obj;
  });
}

function applySchema(db: import("sql.js").Database): void {
  db.exec(CREATE_TABLES_SQL);
}

function numOrNull(v: string | number | null): number | null {
  return v === null || v === "" ? null : Number(v);
}

function strOrNull(v: string | number | null): string | null {
  return v === null ? null : String(v);
}

function transactionsFromRows(rows: Record<string, string | number | null>[]): Transaction[] {
  return rows.map((r) => {
    const tx: Transaction = {
      id: String(r.id),
      date: String(r.date),
      etf: String(r.etf),
      type: r.type === "SELL" ? "SELL" : "BUY",
      units: Number(r.units),
      pricePerUnit: Number(r.pricePerUnit),
    };
    const realizedGain = numOrNull(r.realizedGain);
    if (realizedGain !== null) tx.realizedGain = realizedGain;
    const lotId = strOrNull(r.lotId);
    tx.lotId = lotId;
    const lotIds = strOrNull(r.lotIds);
    if (lotIds !== null) tx.lotIds = JSON.parse(lotIds) as string[];
    const disposalMethod = strOrNull(r.disposalMethod);
    if (disposalMethod !== null) tx.disposalMethod = disposalMethod as Transaction["disposalMethod"];
    const shortTerm = numOrNull(r.realizedShortTermGain);
    if (shortTerm !== null) tx.realizedShortTermGain = shortTerm;
    const longTerm = numOrNull(r.realizedLongTermGain);
    if (longTerm !== null) tx.realizedLongTermGain = longTerm;
    return tx;
  });
}

function lotsFromRows(rows: Record<string, string | number | null>[]): Lot[] {
  return rows.map((r) => {
    const lot: Lot = {
      id: String(r.id),
      symbol: String(r.symbol),
      units: Number(r.units),
      costBasisPerUnit: Number(r.costBasisPerUnit),
      purchaseDate: String(r.purchaseDate),
    };
    const notes = strOrNull(r.notes);
    if (notes !== null) lot.notes = notes;
    const originalTransactionId = strOrNull(r.originalTransactionId);
    if (originalTransactionId !== null) lot.originalTransactionId = originalTransactionId;
    const linkedDividendId = strOrNull(r.linkedDividendId);
    if (linkedDividendId !== null) lot.linkedDividendId = linkedDividendId;
    return lot;
  });
}

function dividendsFromRows(rows: Record<string, string | number | null>[]): Dividend[] {
  return rows.map((r) => {
    const dividend: Dividend = {
      id: String(r.id),
      etf: String(r.etf),
      exDate: String(r.exDate),
      payDate: String(r.payDate),
      amountPerUnit: Number(r.amountPerUnit),
      unitsHeldAtExDate: Number(r.unitsHeldAtExDate),
    };
    const frankingCredits = numOrNull(r.frankingCredits);
    if (frankingCredits !== null) dividend.frankingCredits = frankingCredits;
    return dividend;
  });
}

function priceAlertsFromRows(rows: Record<string, string | number | null>[]): PriceAlert[] {
  return rows.map((r) => ({
    id: String(r.id),
    etf: String(r.etf),
    targetPrice: Number(r.targetPrice),
    above: Number(r.above) === 1,
    triggered: Number(r.triggered) === 1,
  }));
}

function reminderSchedulesFromRows(rows: Record<string, string | number | null>[]): ReminderSchedule[] {
  return rows.map((r) => {
    const schedule: ReminderSchedule = {
      id: String(r.id),
      enabled: Number(r.enabled) === 1,
      amount: Number(r.amount),
      intervalDays: Number(r.intervalDays),
      nextTriggerAt: String(r.nextTriggerAt),
    };
    const lastTriggeredAt = strOrNull(r.lastTriggeredAt);
    if (lastTriggeredAt !== null) schedule.lastTriggeredAt = lastTriggeredAt;
    return schedule;
  });
}

function etfConfigsFromRows(rows: Record<string, string | number | null>[]): EtfConfig[] {
  return rows.map((r) => ({
    symbol: String(r.symbol),
    yahooSymbol: String(r.yahooSymbol),
    name: String(r.name),
    enabled: Number(r.enabled) === 1,
  }));
}

function readSettings(db: import("sql.js").Database): Record<string, string> {
  const settings: Record<string, string> = {};
  for (const row of queryRows(db, "SELECT key, value FROM settings")) {
    settings[String(row.key)] = String(row.value);
  }
  return settings;
}

export async function saveStateToSqlite(state: State): Promise<Uint8Array> {
  const SQL = await getSqlJs();
  const db = new SQL.Database();
  try {
    applySchema(db);

    const insertStmt = db.prepare(
      "INSERT INTO transactions (id, date, etf, type, units, pricePerUnit, realizedGain, lotId, lotIds, disposalMethod, realizedShortTermGain, realizedLongTermGain) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    for (const tx of state.transactions) {
      insertStmt.run([
        tx.id,
        tx.date,
        tx.etf,
        tx.type,
        tx.units,
        tx.pricePerUnit,
        tx.realizedGain ?? null,
        tx.lotId ?? null,
        tx.lotIds ? JSON.stringify(tx.lotIds) : null,
        tx.disposalMethod ?? null,
        tx.realizedShortTermGain ?? null,
        tx.realizedLongTermGain ?? null,
      ]);
    }
    insertStmt.free();

    const insertLotsStmt = db.prepare(
      "INSERT INTO lots (id, symbol, units, costBasisPerUnit, purchaseDate, notes, originalTransactionId, linkedDividendId) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const lot of state.lots) {
      insertLotsStmt.run([
        lot.id,
        lot.symbol,
        lot.units,
        lot.costBasisPerUnit,
        lot.purchaseDate,
        lot.notes ?? null,
        lot.originalTransactionId ?? null,
        lot.linkedDividendId ?? null,
      ]);
    }
    insertLotsStmt.free();

    const insertDividendsStmt = db.prepare(
      "INSERT INTO dividends (id, etf, exDate, payDate, amountPerUnit, unitsHeldAtExDate, frankingCredits) VALUES (?,?,?,?,?,?,?)",
    );
    for (const div of state.dividends) {
      insertDividendsStmt.run([
        div.id,
        div.etf,
        div.exDate,
        div.payDate,
        div.amountPerUnit,
        div.unitsHeldAtExDate,
        div.frankingCredits ?? null,
      ]);
    }
    insertDividendsStmt.free();

    const insertAlertsStmt = db.prepare(
      "INSERT INTO price_alerts (id, etf, targetPrice, above, triggered) VALUES (?,?,?,?,?)",
    );
    for (const alert of state.priceAlerts) {
      insertAlertsStmt.run([
        alert.id,
        alert.etf,
        alert.targetPrice,
        alert.above ? 1 : 0,
        alert.triggered ? 1 : 0,
      ]);
    }
    insertAlertsStmt.free();

    const insertSchedulesStmt = db.prepare(
      "INSERT INTO reminder_schedules (id, enabled, amount, intervalDays, nextTriggerAt, lastTriggeredAt) VALUES (?,?,?,?,?,?)",
    );
    for (const schedule of state.reminderSchedules) {
      insertSchedulesStmt.run([
        schedule.id,
        schedule.enabled ? 1 : 0,
        schedule.amount,
        schedule.intervalDays,
        schedule.nextTriggerAt,
        schedule.lastTriggeredAt ?? null,
      ]);
    }
    insertSchedulesStmt.free();

    const insertConfigsStmt = db.prepare(
      "INSERT INTO etf_configs (symbol, yahooSymbol, name, enabled) VALUES (?,?,?,?)",
    );
    for (const config of state.etfConfigs) {
      insertConfigsStmt.run([
        config.symbol,
        config.yahooSymbol,
        config.name,
        config.enabled ? 1 : 0,
      ]);
    }
    insertConfigsStmt.free();

    const insertSettingStmt = db.prepare(
      "INSERT INTO settings (key, value) VALUES (?,?)",
    );
    insertSettingStmt.run(["targetAlloc", JSON.stringify(state.targetAlloc)]);
    insertSettingStmt.run([
      "fortnightlyTargetAlloc",
      JSON.stringify(state.fortnightlyTargetAlloc ?? {}),
    ]);
    insertSettingStmt.run(["schemaVersion", String(SQLITE_SCHEMA_VERSION)]);
    insertSettingStmt.free();

    return db.export();
  } finally {
    db.close();
  }
}

export async function loadStateFromSqlite(bytes: Uint8Array): Promise<State> {
  const SQL = await getSqlJs();
  const db = new SQL.Database(bytes);
  try {
    const transactions = transactionsFromRows(queryRows(db, "SELECT * FROM transactions"));
    const lots = lotsFromRows(queryRows(db, "SELECT * FROM lots"));
    const dividends = dividendsFromRows(queryRows(db, "SELECT * FROM dividends"));
    const priceAlerts = priceAlertsFromRows(queryRows(db, "SELECT * FROM price_alerts"));
    const reminderSchedules = reminderSchedulesFromRows(queryRows(db, "SELECT * FROM reminder_schedules"));
    const etfConfigs = etfConfigsFromRows(queryRows(db, "SELECT * FROM etf_configs"));
    const settings = readSettings(db);

    const { alloc, holdingPeriodDays, driftTolerancePercent } = JSON.parse(
      settings["targetAlloc"] ?? "{}",
    ) as Partial<TargetAlloc>;

    let targetAlloc: TargetAlloc;
    if (settings["targetAlloc"] && typeof alloc === "object" && alloc !== null) {
      targetAlloc = {
        alloc,
        holdingPeriodDays:
          holdingPeriodDays ?? (Number.isFinite(holdingPeriodDays) ? holdingPeriodDays : undefined),
        driftTolerancePercent:
          driftTolerancePercent ?? (Number.isFinite(driftTolerancePercent) ? driftTolerancePercent : undefined),
      };
    } else {
      targetAlloc = { alloc: {}, holdingPeriodDays: 365, driftTolerancePercent: 5 };
    }

    const fortnightlyTargetAlloc = settings["fortnightlyTargetAlloc"]
      ? (JSON.parse(settings["fortnightlyTargetAlloc"]) as Record<string, number>)
      : undefined;

    return {
      transactions,
      lots,
      dividends,
      priceAlerts,
      reminderSchedules,
      etfConfigs,
      targetAlloc,
      ...(fortnightlyTargetAlloc ? { fortnightlyTargetAlloc } : {}),
    };
  } finally {
    db.close();
  }
}

export async function validateDatabaseBytes(bytes: Uint8Array): Promise<boolean> {
  try {
    const SQL = await getSqlJs();
    const db = new SQL.Database(bytes);
    try {
      const rows = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = (rows[0]?.values ?? []).map((r) => String(r[0]));
      return (
        tableNames.includes("transactions") &&
        tableNames.includes("lots") &&
        tableNames.includes("dividends") &&
        tableNames.includes("etf_configs")
      );
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}