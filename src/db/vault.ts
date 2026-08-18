import Dexie from "dexie";
import type { Table } from "dexie";

const VAULT_DB_NAME = "ETFPortfolioVault";

interface VaultRecord {
  id: string;
  bytes: Uint8Array;
}

let vaultDb: Dexie | null = null;

function getDb(): Dexie {
  if (!vaultDb) {
    vaultDb = new Dexie(VAULT_DB_NAME);
    vaultDb.version(1).stores({
      blobs: "id",
    });
  }
  return vaultDb;
}

const BLOB_KEY = "etf-portfolio.db";

export async function getVaultBytes(): Promise<Uint8Array | null> {
  const db = getDb();
  const record = await (db.table("blobs") as Table<VaultRecord, string>).get(BLOB_KEY);
  return record?.bytes ?? null;
}

export async function setVaultBytes(bytes: Uint8Array): Promise<void> {
  const db = getDb();
  await (db.table("blobs") as Table<VaultRecord, string>).put({
    id: BLOB_KEY,
    bytes,
  });
}
