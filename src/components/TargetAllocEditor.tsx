import { useState, useEffect } from "react";
import { TargetAlloc } from "../types";
import { DEFAULT_ETF_SYMBOLS } from "../types";

interface Props {
  targetAlloc: TargetAlloc;
  enabledSymbols: string[];
  onUpdate: (newTarget: TargetAlloc) => void;
}

export function TargetAllocEditor({ targetAlloc, enabledSymbols, onUpdate }: Props) {
  const symbols = enabledSymbols.length > 0 ? enabledSymbols : DEFAULT_ETF_SYMBOLS;
  const [localAlloc, setLocalAlloc] = useState(targetAlloc);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalAlloc(targetAlloc);
  }, [targetAlloc]);

  const handleChange = (etf: string, value: number) => {
    const newAlloc = {
      ...localAlloc,
      alloc: { ...localAlloc.alloc, [etf]: value },
    };
    setLocalAlloc(newAlloc);
    const sum = symbols.reduce(
      (total, symbol) => total + ((newAlloc.alloc[symbol] as number) || 0),
      0,
    );
    if (Math.abs(sum - 100) > 0.01) {
      setError(`Total must be 100% (currently ${sum.toFixed(1)}%)`);
    } else {
      setError("");
    }
  };

  const handleSave = () => {
    if (!error) {
      onUpdate(localAlloc);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3">Target Allocation</h3>
      <div className="space-y-3">
        {symbols.map((etf) => {
          const pct = (localAlloc.alloc[etf] as number) ?? 0;
          return (
            <div key={etf}>
              <label className="block text-sm font-medium">{etf}</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pct}
                  onChange={(e) =>
                    handleChange(etf, Number(e.target.value))
                  }
                  className="flex-1"
                />
                <span className="w-12 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <button
        onClick={handleSave}
        disabled={!!error}
        className="mt-3 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        Save Target Allocation
      </button>
    </div>
  );
}
