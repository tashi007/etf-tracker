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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dividend History
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Total: ${totalDividends.toFixed(2)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b dark:border-gray-700">
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
              <tr key={d.id} className="border-b dark:border-gray-700">
                <td className="py-2">{d.exDate}</td>
                <td>{d.etf}</td>
                <td className="text-right">${d.amountPerUnit.toFixed(2)}</td>
                <td className="text-right">{d.unitsHeldAtExDate}</td>
                <td className="text-right">
                  ${(d.amountPerUnit * d.unitsHeldAtExDate).toFixed(2)}
                </td>
                <td className="text-right">
                  {d.frankingCredits ? `$${d.frankingCredits.toFixed(2)}` : "-"}
                </td>
                <td className="text-center">
                  <button
                    onClick={() => onDelete(d.id)}
                    className="text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {dividends.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">
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
