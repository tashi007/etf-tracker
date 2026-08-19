import { useState, useEffect, useRef } from "react";
import { Lot, Transaction, TransactionType, DisposalMethod, EtfConfig } from "../types";

interface Props {
  onAdd: (tx: Transaction) => void;
  currentPrices: Record<string, number>;
  lots: Lot[];
  etfConfigs: EtfConfig[];
  initialSuggestion?: { etf: string; amount: number } | null;
}

export function TransactionForm({
  onAdd,
  currentPrices,
  lots,
  etfConfigs,
  initialSuggestion,
}: Props) {
  const enabledEtfs = etfConfigs.filter((e) => e.enabled);
  const [etf, setEtf] = useState<string>(enabledEtfs[0]?.symbol ?? "");
  const [type, setType] = useState<TransactionType>("BUY");
  const [buyUnits, setBuyUnits] = useState(10);
  const [sellUnits, setSellUnits] = useState(10);
  const [disposalMethod, setDisposalMethod] = useState<DisposalMethod>("FIFO");
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const appliedSuggestionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialSuggestion) return;
    const key = `${initialSuggestion.etf}:${initialSuggestion.amount}`;
    if (appliedSuggestionRef.current === key) return;
    appliedSuggestionRef.current = key;
    setEtf(initialSuggestion.etf);
    setType("BUY");
    const price = currentPrices[initialSuggestion.etf] ?? 1;
    const units = Math.max(1, Math.round(initialSuggestion.amount / price));
    setBuyUnits(units);
    setPriceTouched(false);
  }, [initialSuggestion, currentPrices]);

  const marketPrice = currentPrices[etf] ?? 0;
  const marketPriceStr = marketPrice > 0 ? marketPrice.toFixed(2) : "";
  const effectivePrice = priceTouched ? pricePerUnit : marketPriceStr;

  const parsedPrice = parseFloat(effectivePrice);
  const isValidPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const isValidBuyUnits = Number.isInteger(buyUnits) && buyUnits > 0;
  const availableLots = lots.filter(
    (lot) => lot.symbol === etf && lot.units > 0,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPrice) return;

    const unitsToSubmit = type === "BUY" ? buyUnits : sellUnits;
    if (type === "BUY" && !isValidBuyUnits) return;
    if (type === "SELL" && unitsToSubmit <= 0) return;
    if (
      type === "SELL" &&
      disposalMethod === "SPECIFIC" &&
      selectedLotIds.length === 0
    ) {
      return;
    }

    onAdd({
      id: Date.now().toString(),
      date,
      etf,
      type,
      units: parseFloat(String(unitsToSubmit)) || 0,
      pricePerUnit: parsedPrice,
      disposalMethod: type === "SELL" ? disposalMethod : undefined,
      lotIds: type === "SELL" ? selectedLotIds : undefined,
    });
    if (type === "SELL") {
      setSellUnits(10);
      setSelectedLotIds([]);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-3 items-end"
    >
      <div>
        <label htmlFor="tx-etf" className="block text-sm font-medium mb-1">
          ETF
        </label>
        <select
          id="tx-etf"
          value={etf}
          onChange={(e) => setEtf(e.target.value)}
          className="border rounded p-2"
        >
          {enabledEtfs.map((e) => (
            <option key={e.symbol} value={e.symbol}>
              {e.symbol}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="tx-type" className="block text-sm font-medium mb-1">
          Type
        </label>
        <select
          id="tx-type"
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType)}
          className="border rounded p-2"
        >
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
      </div>
      {type === "BUY" ? (
        <div>
          <label htmlFor="tx-units" className="block text-sm font-medium mb-1">
            Units
          </label>
          <input
            id="tx-units"
            type="number"
            value={buyUnits}
            onChange={(e) => setBuyUnits(Number(e.target.value))}
            className="border rounded p-2 w-24"
            step="1"
            min="1"
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label
              htmlFor="tx-sell-units"
              className="block text-sm font-medium mb-1"
            >
              Units
            </label>
            <input
              id="tx-sell-units"
              type="number"
              value={sellUnits}
              onChange={(e) => setSellUnits(Number(e.target.value))}
              className="border rounded p-2 w-24"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label
              htmlFor="tx-disposal"
              className="block text-sm font-medium mb-1"
            >
              Lot method
            </label>
            <select
              id="tx-disposal"
              value={disposalMethod}
              onChange={(e) =>
                setDisposalMethod(e.target.value as DisposalMethod)
              }
              className="border rounded p-2"
            >
              <option value="FIFO">FIFO</option>
              <option value="HIFO">HIFO</option>
              <option value="SPECIFIC">Specific lots</option>
            </select>
          </div>
          {disposalMethod === "SPECIFIC" && (
            <div className="min-w-64">
              <label className="block text-sm font-medium mb-1">
                Available lots
              </label>
              <select
                multiple
                value={selectedLotIds}
                onChange={(e) =>
                  setSelectedLotIds(
                    Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  )
                }
                className="border rounded p-2 w-full min-h-24"
              >
                {availableLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.id} - {lot.units.toFixed(4)} units @ $
                    {lot.costBasisPerUnit.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="text-xs text-gray-500 max-w-sm">
            {availableLots.length > 0
              ? `${availableLots.length} active lot(s) available for ${etf}.`
              : `No active lots available for ${etf}.`}
          </div>
        </div>
      )}
      <div>
        <label htmlFor="tx-price" className="block text-sm font-medium mb-1">
          Price per unit ($)
        </label>
        <div className="flex items-center gap-1">
          <input
            id="tx-price"
            type="number"
            value={effectivePrice}
            onChange={(e) => {
              setPriceTouched(true);
              setPricePerUnit(e.target.value);
            }}
            className="border rounded p-2 w-28"
            step="0.01"
            min="0"
            placeholder="Unavailable"
            inputMode="decimal"
          />
          {priceTouched && marketPrice > 0 && (
            <button
              type="button"
              onClick={() => setPriceTouched(false)}
              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
            >
              Use market price
            </button>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="tx-date" className="block text-sm font-medium mb-1">
          Date
        </label>
        <input
          id="tx-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded p-2"
        />
      </div>
      <button
        type="submit"
        disabled={
          !isValidPrice ||
          (type === "BUY" && !isValidBuyUnits) ||
          (type === "SELL" && sellUnits <= 0)
        }
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add Transaction
      </button>
    </form>
  );
}
