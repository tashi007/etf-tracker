import { Transaction } from "../types";
import { buildTaxLotReportRows } from "./lots";

export function exportTransactionsToCSV(transactions: Transaction[]) {
  const headers = [
    "Date",
    "ETF",
    "Type",
    "Units",
    "Price Per Unit",
    "Amount",
    "Lot IDs",
    "Disposal Method",
    "Realized Gain (if sell)",
    "Short-term Realized",
    "Long-term Realized",
  ];
  const rows = transactions.map((tx) => {
    const amount = tx.units * tx.pricePerUnit;
    return [
      tx.date,
      tx.etf,
      tx.type,
      tx.units.toFixed(4),
      tx.pricePerUnit.toFixed(2),
      amount.toFixed(2),
      tx.lotIds?.join("|") ?? tx.lotId ?? "",
      tx.disposalMethod ?? "",
      tx.realizedGain ? tx.realizedGain.toFixed(2) : "",
      tx.realizedShortTermGain?.toFixed(2) ?? "",
      tx.realizedLongTermGain?.toFixed(2) ?? "",
    ];
  });

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etf-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTaxLotReportToCSV(
  transactions: Transaction[],
  holdingPeriodDays = 365,
) {
  const headers = [
    "Sale Transaction ID",
    "Sale Date",
    "ETF",
    "Lot ID",
    "Purchase Date",
    "Units",
    "Sale Price/Unit",
    "Proceeds",
    "Cost Basis",
    "Gain",
    "ST/LT",
    "Disposal Method",
  ];

  const rows = buildTaxLotReportRows(transactions, holdingPeriodDays).map(
    (row) => [
      row.saleTransactionId,
      row.saleDate,
      row.symbol,
      row.lotId,
      row.purchaseDate,
      row.units.toFixed(4),
      row.salePricePerUnit.toFixed(2),
      row.proceeds.toFixed(2),
      row.costBasis.toFixed(2),
      row.gain.toFixed(2),
      row.isLongTerm ? "LT" : "ST",
      row.disposalMethod,
    ],
  );

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etf-tax-lot-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
