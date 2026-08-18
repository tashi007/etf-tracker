import { Transaction } from "../types";
import { Trash2 } from "lucide-react";

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: Props) {
  const sorted = [...transactions].reverse();
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2">Date</th>
              <th className="text-left">ETF</th>
              <th className="text-center">Type</th>
              <th className="text-right">Units</th>
              <th className="text-right">Price/Unit</th>
              <th className="text-right">Amount ($)</th>
              <th className="text-right">Realized Gain</th>
              <th className="text-right">Lot(s)</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx) => (
              <tr key={tx.id} className="border-b">
                <td className="py-2">{tx.date || "?"}</td>
                <td>{tx.etf}</td>
                <td
                  className={`text-center ${tx.type === "SELL" ? "text-red-600" : "text-green-600"}`}
                >
                  {tx.type}
                </td>
                <td className="text-right">{(tx.units ?? 0).toFixed(4)}</td>
                <td className="text-right">
                  ${(tx.pricePerUnit ?? 0).toFixed(2)}
                </td>
                <td className="text-right">
                  ${((tx.units ?? 0) * (tx.pricePerUnit ?? 0)).toFixed(2)}
                </td>
                <td className="text-right">
                  {tx.realizedGain !== undefined
                    ? `$${tx.realizedGain.toFixed(2)}${
                        tx.realizedShortTermGain || tx.realizedLongTermGain
                          ? ` (ST ${tx.realizedShortTermGain?.toFixed(2) ?? "0.00"}, LT ${tx.realizedLongTermGain?.toFixed(2) ?? "0.00"})`
                          : ""
                      }`
                    : "-"}
                </td>
                <td className="text-right text-xs text-gray-500">
                  {tx.lotIds?.length ? tx.lotIds.join(", ") : tx.lotId || "-"}
                </td>
                <td className="text-center">
                  <button
                    onClick={() => onDelete(tx.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-4 text-gray-500">
                  No transactions yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
