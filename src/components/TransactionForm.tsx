import { useState, useEffect, useRef } from "react";
import { Lot, Transaction, TransactionType, DisposalMethod, EtfConfig } from "../types";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Field";

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
    if (!initialSuggestion) {
      appliedSuggestionRef.current = null;
      return;
    }
    const key = `${initialSuggestion.etf}:${initialSuggestion.amount}`;
    if (appliedSuggestionRef.current === key) return;
    const price = currentPrices[initialSuggestion.etf];
    if (!Number.isFinite(price) || price <= 0) return;
    appliedSuggestionRef.current = key;
    setEtf(initialSuggestion.etf);
    setType("BUY");
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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="ETF" htmlFor="tx-etf">
        <Select
          id="tx-etf"
          value={etf}
          onChange={(e) => setEtf(e.target.value)}
        >
          {enabledEtfs.map((e) => (
            <option key={e.symbol} value={e.symbol}>
              {e.symbol}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Type" htmlFor="tx-type">
        <Select
          id="tx-type"
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType)}
        >
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </Select>
      </Field>
      {type === "BUY" ? (
        <Field label="Units" htmlFor="tx-units">
          <Input
            id="tx-units"
            type="number"
            value={buyUnits}
            onChange={(e) => setBuyUnits(Number(e.target.value))}
            className="w-24"
            step="1"
            min="1"
          />
        </Field>
      ) : (
        <div className="flex flex-wrap gap-3 items-end">
          <Field label="Units" htmlFor="tx-sell-units">
            <Input
              id="tx-sell-units"
              type="number"
              value={sellUnits}
              onChange={(e) => setSellUnits(Number(e.target.value))}
              className="w-24"
              step="0.01"
              min="0"
            />
          </Field>
          <Field label="Lot method" htmlFor="tx-disposal">
            <Select
              id="tx-disposal"
              value={disposalMethod}
              onChange={(e) =>
                setDisposalMethod(e.target.value as DisposalMethod)
              }
            >
              <option value="FIFO">FIFO</option>
              <option value="HIFO">HIFO</option>
              <option value="SPECIFIC">Specific lots</option>
            </Select>
          </Field>
          {disposalMethod === "SPECIFIC" && (
            <div className="min-w-64">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                className="min-h-24 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900"
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
          <div className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {availableLots.length > 0
              ? `${availableLots.length} active lot(s) available for ${etf}.`
              : `No active lots available for ${etf}.`}
          </div>
        </div>
      )}
      <Field label="Price per unit ($)" htmlFor="tx-price">
        <div className="flex items-center gap-1">
          <Input
            id="tx-price"
            type="number"
            value={effectivePrice}
            onChange={(e) => {
              setPriceTouched(true);
              setPricePerUnit(e.target.value);
            }}
            className="w-28"
            step="0.01"
            min="0"
            placeholder="Unavailable"
            inputMode="decimal"
          />
          {priceTouched && marketPrice > 0 && (
            <button
              type="button"
              onClick={() => setPriceTouched(false)}
              className="whitespace-nowrap text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Use market price
            </button>
          )}
        </div>
      </Field>
      <Field label="Date" htmlFor="tx-date">
        <Input
          id="tx-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <Button
        type="submit"
        disabled={
          !isValidPrice ||
          (type === "BUY" && !isValidBuyUnits) ||
          (type === "SELL" && sellUnits <= 0)
        }
      >
        Add Transaction
      </Button>
    </form>
  );
}
