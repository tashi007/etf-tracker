import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { Transaction } from "../types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input, Select } from "./ui/Field";
import { Modal } from "./ui/Modal";
import {
  filterTransactions,
  paginateTransactions,
  SortDirection,
  sortTransactions,
  transactionAmount,
  TransactionSortKey,
} from "../utils/transactionTable";

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const PAGE_SIZES = [20, 50, "all"] as const;

const columns: { key: TransactionSortKey; label: string; align: "left" | "right" | "center" }[] = [
  { key: "date", label: "Date", align: "left" },
  { key: "etf", label: "ETF", align: "left" },
  { key: "type", label: "Type", align: "center" },
  { key: "units", label: "Units", align: "right" },
  { key: "pricePerUnit", label: "Price/Unit", align: "right" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "realizedGain", label: "Realized Gain", align: "right" },
];

export function TransactionList({ transactions, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<TransactionSortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(20);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const filtered = filterTransactions(transactions, search);
  const sorted = sortTransactions(filtered, sortKey, sortDirection);
  const { rows, pageCount } = paginateTransactions(sorted, page, pageSize);

  const toggleSort = (key: TransactionSortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "date" || key === "realizedGain" ? "desc" : "asc");
    }
    setPage(1);
  };

  return (
    <Card title="Transaction History">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search ETF, type or date"
            className="w-full pl-9"
            aria-label="Search transactions"
          />
        </div>
        <Select
          value={String(pageSize)}
          onChange={(e) => {
            setPageSize(e.target.value === "all" ? "all" : Number(e.target.value));
            setPage(1);
          }}
          aria-label="Rows per page"
        >
          {PAGE_SIZES.map((size) => (
            <option key={String(size)} value={String(size)}>
              {size === "all" ? "All" : `${size} / page`}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-medium ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 ${
                      sortKey === col.key ? "text-indigo-600 dark:text-indigo-400" : ""
                    }`}
                  >
                    {col.label}
                    {sortKey === col.key &&
                      (sortDirection === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      ))}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">Lot(s)</th>
              <th className="px-3 py-2 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr
                key={tx.id}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  {tx.date || "?"}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                  {tx.etf}
                </td>
                <td className="px-3 py-2 text-center">
                  <Badge tone={tx.type === "SELL" ? "loss" : "gain"}>
                    {tx.type}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {(tx.units ?? 0).toFixed(4)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  ${(tx.pricePerUnit ?? 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  ${transactionAmount(tx).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {tx.realizedGain !== undefined
                    ? `$${tx.realizedGain.toFixed(2)}${
                        tx.realizedShortTermGain || tx.realizedLongTermGain
                          ? ` (ST ${tx.realizedShortTermGain?.toFixed(2) ?? "0.00"}, LT ${tx.realizedLongTermGain?.toFixed(2) ?? "0.00"})`
                          : ""
                      }`
                    : "-"}
                </td>
                <td className="px-3 py-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  {tx.lotIds?.length ? tx.lotIds.join(", ") : tx.lotId || "-"}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => setPendingDelete(tx)}
                    className="text-rose-500 hover:text-rose-700 dark:text-rose-400"
                    title="Delete transaction"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  {transactions.length === 0
                    ? "No transactions yet."
                    : "No transactions match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          Page {page} of {pageCount} · {sorted.length} transaction
          {sorted.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="h-8 px-2"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPage(Math.min(pageCount, page + 1))}
            disabled={page >= pageCount}
            className="h-8 px-2"
            title="Next page"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Modal
        open={pendingDelete !== null}
        title="Delete Transaction"
        onClose={() => setPendingDelete(null)}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Delete {pendingDelete?.type} of {pendingDelete?.units.toFixed(4)}{" "}
          {pendingDelete?.etf} on {pendingDelete?.date}? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setPendingDelete(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (pendingDelete) onDelete(pendingDelete.id);
              setPendingDelete(null);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
