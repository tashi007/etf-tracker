import { useMemo, useState } from "react";
import { Dividend, EtfConfig, Transaction } from "../types";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Field";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Action" htmlFor="ca-action">
          <Select
            id="ca-action"
            value={actionType}
            onChange={(event) =>
              setActionType(event.target.value as "SPLIT" | "DRP")
            }
          >
            <option value="SPLIT">Split</option>
            <option value="DRP">Dividend reinvestment</option>
          </Select>
        </Field>
        <Field label="ETF" htmlFor="ca-etf">
          <Select
            id="ca-etf"
            value={etf}
            onChange={(event) =>
              setEtf(event.target.value as Transaction["etf"])
            }
          >
            {enabledEtfs.map((e) => (
              <option key={e.symbol} value={e.symbol}>
                {e.symbol}
              </option>
            ))}
          </Select>
        </Field>
        {actionType === "SPLIT" ? (
          <>
            <Field label="Ratio numerator" htmlFor="ca-num">
              <Input
                id="ca-num"
                type="number"
                min="1"
                step="1"
                value={splitNumerator}
                onChange={(event) =>
                  setSplitNumerator(Number(event.target.value))
                }
                className="w-24"
              />
            </Field>
            <Field label="Ratio denominator" htmlFor="ca-den">
              <Input
                id="ca-den"
                type="number"
                min="1"
                step="1"
                value={splitDenominator}
                onChange={(event) =>
                  setSplitDenominator(Number(event.target.value))
                }
                className="w-24"
              />
            </Field>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total ratio: {splitRatio.toFixed(2)}x
            </div>
          </>
        ) : (
          <>
            <Field label="Dividend entry" htmlFor="ca-div">
              <Select
                id="ca-div"
                value={dividendId}
                onChange={(event) => setDividendId(event.target.value)}
                className="min-w-56"
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
              </Select>
            </Field>
            <Field label="Reinvestment price" htmlFor="ca-price">
              <Input
                id="ca-price"
                type="number"
                min="0"
                step="0.01"
                value={effectiveReinvestmentPrice || ""}
                onChange={(event) =>
                  setReinvestmentPrice(Number(event.target.value))
                }
                className="w-32"
                placeholder={
                  currentPrice > 0 ? currentPrice.toFixed(2) : "0.00"
                }
              />
            </Field>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Reinvesting at{" "}
              {effectiveReinvestmentPrice > 0
                ? `$${effectiveReinvestmentPrice.toFixed(2)}`
                : "current price"}
            </div>
          </>
        )}
        <Field label="Date" htmlFor="ca-date">
          <Input
            id="ca-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Button type="submit">Apply Action</Button>
      </div>
    </form>
  );
}
