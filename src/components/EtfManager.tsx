import { useState } from "react";
import { EtfConfig } from "../types";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Props {
  etfConfigs: EtfConfig[];
  onUpdate: (configs: EtfConfig[]) => void;
  transactionCount: (symbol: string) => number;
}

export function EtfManager({ etfConfigs, onUpdate, transactionCount }: Props) {
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) {
      setError("Symbol is required.");
      return;
    }
    if (etfConfigs.some((e) => e.symbol === symbol)) {
      setError(`${symbol} already exists.`);
      return;
    }
    if (!/^[A-Z0-9.]+$/.test(symbol)) {
      setError("Symbol can only contain letters, numbers, and dots.");
      return;
    }

    const yahooSymbol = `${symbol}.AX`;
    const config: EtfConfig = {
      symbol,
      yahooSymbol,
      name: newName.trim() || symbol,
      enabled: true,
    };
    onUpdate([...etfConfigs, config]);
    setNewSymbol("");
    setNewName("");
    setError("");
  };

  const handleRemove = (symbol: string) => {
    const txCount = transactionCount(symbol);
    if (txCount > 0) {
      if (
        !confirm(
          `${symbol} has ${txCount} transaction(s). Removing it will hide it from forms but keep historical data. Continue?`,
        )
      ) {
        return;
      }
    }
    onUpdate(etfConfigs.filter((e) => e.symbol !== symbol));
  };

  const handleToggle = (symbol: string) => {
    onUpdate(
      etfConfigs.map((e) =>
        e.symbol === symbol ? { ...e, enabled: !e.enabled } : e,
      ),
    );
  };

  const handleYahooSymbolChange = (symbol: string, yahooSymbol: string) => {
    onUpdate(
      etfConfigs.map((e) =>
        e.symbol === symbol ? { ...e, yahooSymbol } : e,
      ),
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        ETF Configuration
      </h3>

      <div className="space-y-2 mb-4">
        {etfConfigs.map((etf) => (
          <div
            key={etf.symbol}
            className="flex items-center gap-2 py-2 border-b dark:border-gray-700"
          >
            <button
              onClick={() => handleToggle(etf.symbol)}
              className="text-gray-500 hover:text-gray-700"
              title={etf.enabled ? "Disable" : "Enable"}
            >
              {etf.enabled ? (
                <ToggleRight size={20} className="text-green-600" />
              ) : (
                <ToggleLeft size={20} className="text-gray-400" />
              )}
            </button>
            <span
              className={`font-mono text-sm w-16 ${etf.enabled ? "" : "text-gray-400"}`}
            >
              {etf.symbol}
            </span>
            <input
              type="text"
              value={etf.yahooSymbol}
              onChange={(e) =>
                handleYahooSymbolChange(etf.symbol, e.target.value)
              }
              className="border rounded px-2 py-1 text-sm w-28 dark:bg-gray-700 dark:border-gray-600"
              title="Yahoo Finance symbol"
            />
            <input
              type="text"
              value={etf.name}
              onChange={(e) =>
                onUpdate(
                  etfConfigs.map((c) =>
                    c.symbol === etf.symbol ? { ...c, name: e.target.value } : c,
                  ),
                )
              }
              className="border rounded px-2 py-1 text-sm flex-1 dark:bg-gray-700 dark:border-gray-600"
              placeholder="Name"
            />
            <button
              onClick={() => handleRemove(etf.symbol)}
              className="text-red-500 hover:text-red-700 p-1"
              title="Remove ETF"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Symbol</label>
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => {
              setNewSymbol(e.target.value);
              setError("");
            }}
            placeholder="e.g. IVV"
            className="border rounded px-2 py-1 text-sm w-24 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Yahoo symbol
          </label>
          <span className="border rounded px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 w-28 inline-block">
            {newSymbol.trim() ? `${newSymbol.trim().toUpperCase()}.AX` : "?.AX"}
          </span>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Optional name"
            className="border rounded px-2 py-1 text-sm w-36 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
