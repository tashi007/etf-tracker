import { useState } from "react";
import { Dividend, EtfConfig } from "../types";
import { Button } from "./ui/Button";
import { Input, Select } from "./ui/Field";

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Record Dividend
      </p>
      <div className="flex flex-wrap gap-2">
        <Select value={etf} onChange={(e) => setEtf(e.target.value)}>
          {enabledEtfs.map((e) => (
            <option key={e.symbol} value={e.symbol}>
              {e.symbol}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          step="0.01"
          placeholder="$ per unit"
          value={amountPerUnit}
          onChange={(e) => setAmountPerUnit(parseFloat(e.target.value))}
          className="w-28"
        />
        <Input
          type="number"
          step="1"
          placeholder="Units held"
          value={units}
          onChange={(e) => setUnits(parseInt(e.target.value))}
          className="w-28"
        />
        <Input
          type="date"
          value={exDate}
          onChange={(e) => setExDate(e.target.value)}
        />
        <Button type="submit">Add Dividend</Button>
      </div>
    </form>
  );
}
