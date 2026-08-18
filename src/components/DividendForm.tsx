import { useState } from "react";
import { Dividend, EtfConfig } from "../types";

interface Props {
  onAdd: (d: Dividend) => void;
  etfConfigs: EtfConfig[];
}

export function DividendForm({ onAdd, etfConfigs }: Props) {
  const enabledEtfs = etfConfigs.filter((e) => e.enabled);
  const [etf, setEtf] = useState<string>(enabledEtfs[0]?.symbol ?? "");
  const [amountPerUnit, setAmountPerUnit] = useState(1);
  const [exDate, setExDate] = useState(new Date().toISOString().slice(0, 10));
  const [payDate] = useState(new Date().toISOString().slice(0, 10));
  const [units, setUnits] = useState(0);
  const [franking, setFranking] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Date.now().toString(),
      etf,
      exDate,
      payDate,
      amountPerUnit,
      unitsHeldAtExDate: units,
      frankingCredits: franking || undefined,
    });
    setAmountPerUnit(1);
    setUnits(0);
    setFranking(0);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-4"
    >
      <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">
        Record Dividend
      </h3>
      <div className="flex flex-wrap gap-2">
        <select
          value={etf}
          onChange={(e) => setEtf(e.target.value)}
          className="border rounded p-1 dark:bg-gray-700"
        >
          {enabledEtfs.map((e) => (
            <option key={e.symbol} value={e.symbol}>
              {e.symbol}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="$ per unit"
          value={amountPerUnit}
          onChange={(e) => setAmountPerUnit(parseFloat(e.target.value))}
          className="border rounded p-1 w-28 dark:bg-gray-700"
        />
        <input
          type="number"
          step="1"
          placeholder="Units held"
          value={units}
          onChange={(e) => setUnits(parseInt(e.target.value))}
          className="border rounded p-1 w-28 dark:bg-gray-700"
        />
        <input
          type="date"
          value={exDate}
          onChange={(e) => setExDate(e.target.value)}
          className="border rounded p-1 dark:bg-gray-700"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
        >
          Add Dividend
        </button>
      </div>
    </form>
  );
}
