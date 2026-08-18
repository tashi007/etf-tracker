import { useMemo, useState } from "react";
import { Dividend, EtfConfig, Transaction } from "../types";

interface Props {
  dividends: Dividend[];
  currentPrices: Record<string, number>;
  etfConfigs: EtfConfig[];
  onApplyCorporateAction: (
    action:
      | { type: "SPLIT"; etf: Transaction["etf"]; ratio: number; date: string }
      | {
          type: "DRP";
          etf: Transaction["etf"];
          dividendId: string;
          dividendAmount: number;
          reinvestmentPrice: number;
          date: string;
        },
  ) => void;
}

export function CorporateActionForm({
  dividends,
  currentPrices,
  etfConfigs,
  onApplyCorporateAction,
}: Props) {
  const enabledEtfs = etfConfigs.filter((e) => e.enabled);
  const [actionType, setActionType] = useState<"SPLIT" | "DRP">("SPLIT");
  const [etf, setEtf] = useState<string>(enabledEtfs[0]?.symbol ?? "");
  const [splitNumerator, setSplitNumerator] = useState(2);
  const [splitDenominator, setSplitDenominator] = useState(1);
  const [dividendId, setDividendId] = useState<string>("");
  const [reinvestmentPrice, setReinvestmentPrice] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const filteredDividends = useMemo(
    () => dividends.filter((dividend) => dividend.etf === etf),
    [dividends, etf],
  );

  const selectedDividend = filteredDividends.find(
    (dividend) => dividend.id === dividendId,
  );
  const splitRatio =
    splitDenominator > 0 ? splitNumerator / splitDenominator : 0;
  const currentPrice = currentPrices[etf] ?? 0;
  const effectiveReinvestmentPrice =
    reinvestmentPrice > 0 ? reinvestmentPrice : currentPrice;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (actionType === "SPLIT") {
      if (splitRatio <= 0) return;
      onApplyCorporateAction({ type: "SPLIT", etf, ratio: splitRatio, date });
      return;
    }

    if (!selectedDividend || effectiveReinvestmentPrice <= 0) return;
    onApplyCorporateAction({
      type: "DRP",
      etf,
      dividendId: selectedDividend.id,
      dividendAmount:
        selectedDividend.amountPerUnit * selectedDividend.unitsHeldAtExDate,
      reinvestmentPrice: effectiveReinvestmentPrice,
      date,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 rounded-lg shadow mt-4"
    >
      <h3 className="text-lg font-semibold mb-3">Corporate Actions</h3>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Action</label>
          <select
            value={actionType}
            onChange={(event) =>
              setActionType(event.target.value as "SPLIT" | "DRP")
            }
            className="border rounded p-2"
          >
            <option value="SPLIT">Split</option>
            <option value="DRP">Dividend reinvestment</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ETF</label>
          <select
            value={etf}
            onChange={(event) =>
              setEtf(event.target.value as Transaction["etf"])
            }
            className="border rounded p-2"
          >
            {enabledEtfs.map((e) => (
              <option key={e.symbol} value={e.symbol}>
                {e.symbol}
              </option>
            ))}
          </select>
        </div>
        {actionType === "SPLIT" ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                Ratio numerator
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={splitNumerator}
                onChange={(event) =>
                  setSplitNumerator(Number(event.target.value))
                }
                className="border rounded p-2 w-24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Ratio denominator
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={splitDenominator}
                onChange={(event) =>
                  setSplitDenominator(Number(event.target.value))
                }
                className="border rounded p-2 w-24"
              />
            </div>
            <div className="text-sm text-gray-600">
              Total ratio: {splitRatio.toFixed(2)}x
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                Dividend entry
              </label>
              <select
                value={dividendId}
                onChange={(event) => setDividendId(event.target.value)}
                className="border rounded p-2 min-w-56"
              >
                <option value="">Select a dividend</option>
                {filteredDividends.map((dividend) => {
                  const amount =
                    dividend.amountPerUnit * dividend.unitsHeldAtExDate;
                  return (
                    <option key={dividend.id} value={dividend.id}>
                      {dividend.exDate} - ${amount.toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Reinvestment price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={effectiveReinvestmentPrice || ""}
                onChange={(event) =>
                  setReinvestmentPrice(Number(event.target.value))
                }
                className="border rounded p-2 w-32"
                placeholder={
                  currentPrice > 0 ? currentPrice.toFixed(2) : "0.00"
                }
              />
            </div>
            <div className="text-sm text-gray-600">
              Reinvesting at{" "}
              {effectiveReinvestmentPrice > 0
                ? `$${effectiveReinvestmentPrice.toFixed(2)}`
                : "current price"}
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="border rounded p-2"
          />
        </div>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Apply Action
        </button>
      </div>
    </form>
  );
}
