import { Transaction } from "../types";

export type TransactionSortKey =
  | "date"
  | "etf"
  | "type"
  | "units"
  | "pricePerUnit"
  | "amount"
  | "realizedGain";

export type SortDirection = "asc" | "desc";

export function transactionAmount(tx: Transaction): number {
  return (tx.units ?? 0) * (tx.pricePerUnit ?? 0);
}

export function filterTransactions(
  transactions: Transaction[],
  search: string,
): Transaction[] {
  const q = search.trim().toLowerCase();
  if (!q) return transactions;
  return transactions.filter(
    (tx) =>
      tx.etf.toLowerCase().includes(q) ||
      tx.type.toLowerCase().includes(q) ||
      tx.date.includes(q),
  );
}

export function sortTransactions(
  transactions: Transaction[],
  key: TransactionSortKey,
  direction: SortDirection,
): Transaction[] {
  const sorted = [...transactions].sort((a, b) => {
    let cmp: number;
    switch (key) {
      case "amount":
        cmp = transactionAmount(a) - transactionAmount(b);
        break;
      case "units":
        cmp = (a.units ?? 0) - (b.units ?? 0);
        break;
      case "pricePerUnit":
        cmp = (a.pricePerUnit ?? 0) - (b.pricePerUnit ?? 0);
        break;
      case "realizedGain": {
        const av = a.realizedGain ?? Number.NEGATIVE_INFINITY;
        const bv = b.realizedGain ?? Number.NEGATIVE_INFINITY;
        cmp = av === bv ? 0 : av < bv ? -1 : 1;
        break;
      }
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "etf":
        cmp = a.etf.localeCompare(b.etf);
        break;
      default:
        cmp = a.type.localeCompare(b.type);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function paginateTransactions(
  transactions: Transaction[],
  page: number,
  pageSize: number | "all",
): { rows: Transaction[]; pageCount: number } {
  if (pageSize === "all") return { rows: transactions, pageCount: 1 };
  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    rows: transactions.slice(start, start + pageSize),
    pageCount,
  };
}
