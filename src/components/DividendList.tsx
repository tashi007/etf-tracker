import { Dividend } from "../types";
import { Trash2 } from "lucide-react";

interface Props {
  dividends: Dividend[];
  onDelete: (id: string) => void;
}

export function DividendList({ dividends, onDelete }: Props) {
  const sorted = [...dividends].reverse();
  const totalDividends = dividends.reduce(
    (sum, d) => sum + d.amountPerUnit * d.unitsHeldAtExDate,
    0,
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Dividend History
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Total: ${totalDividends.toFixed(2)}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="text-left py-2">Ex Date</th>
              <th>ETF</th>
              <th className="text-right">Per Unit</th>
              <th className="text-right">Units</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Franking</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr
                key={d.id}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="py-2">{d.exDate}</td>
                <td>{d.etf}</td>
                <td className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                  ${d.amountPerUnit.toFixed(2)}
                </td>
                <td className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {d.unitsHeldAtExDate}
                </td>
                <td className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                  ${(d.amountPerUnit * d.unitsHeldAtExDate).toFixed(2)}
                </td>
                <td className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {d.frankingCredits ? `$${d.frankingCredits.toFixed(2)}` : "-"}
                </td>
                <td className="text-center">
                  <button
                    onClick={() => onDelete(d.id)}
                    className="text-rose-500 hover:text-rose-700 dark:text-rose-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {dividends.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-4 text-slate-500 dark:text-slate-400"
                >
                  No dividends recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
