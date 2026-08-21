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

const DEV_VAULT_URL = "/api/local/vault";

async function getIndexedDbBytes(): Promise<Uint8Array | null> {
  const db = getDb();
  const record = await (db.table("blobs") as Table<VaultRecord, string>).get(BLOB_KEY);
  return record?.bytes ?? null;
}

async function setIndexedDbBytes(bytes: Uint8Array): Promise<void> {
  const db = getDb();
  await (db.table("blobs") as Table<VaultRecord, string>).put({
    id: BLOB_KEY,
    bytes,
  });
}

async function putDevVault(bytes: Uint8Array): Promise<void> {
  const res = await fetch(DEV_VAULT_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Blob([bytes as BlobPart]),
  });
  if (!res.ok) throw new Error(`Dev vault save failed: ${res.status}`);
}

export async function getVaultBytes(): Promise<Uint8Array | null> {
  if (import.meta.env.DEV) {
    try {
      const res = await fetch(DEV_VAULT_URL);
      if (res.status === 404) {
        const legacy = await getIndexedDbBytes();
        if (legacy) await putDevVault(legacy).catch(() => {});
        return legacy;
      }
      if (!res.ok) throw new Error(`Dev vault read failed: ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return getIndexedDbBytes();
    }
  }
  return getIndexedDbBytes();
}

export async function setVaultBytes(bytes: Uint8Array): Promise<void> {
  if (import.meta.env.DEV) {
    try {
      await putDevVault(bytes);
      return;
    } catch {
      return setIndexedDbBytes(bytes);
    }
  }
  return setIndexedDbBytes(bytes);
}
