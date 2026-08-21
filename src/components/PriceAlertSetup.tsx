import { useState, useEffect } from "react";
import { PriceAlert, EtfConfig } from "../types";
import {
  requestNotificationPermission,
  sendNotification,
} from "../utils/notifications";
import { Trash2 } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input, Select } from "./ui/Field";

interface Props {
  alerts: PriceAlert[];
  currentPrices: Record<string, number>;
  etfConfigs: EtfConfig[];
  onAdd: (alert: PriceAlert) => void;
  onUpdate: (id: string, updates: Partial<PriceAlert>) => void;
  onDelete: (id: string) => void;
}

export function PriceAlertSetup({
  alerts,
  currentPrices,
  etfConfigs,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const enabledEtfs = etfConfigs.filter((e) => e.enabled);
  const [etf, setEtf] = useState<string>(enabledEtfs[0]?.symbol ?? "");
  const [targetPrice, setTargetPrice] = useState(100);
  const [above, setAbove] = useState(true);

  useEffect(() => {
    for (const alert of alerts) {
      if (alert.triggered) continue;
      const price = currentPrices[alert.etf];
      if (!price) continue;
      const condition = alert.above
        ? price >= alert.targetPrice
        : price <= alert.targetPrice;
      if (condition) {
        sendNotification(
          `Price Alert: ${alert.etf}`,
          `${alert.etf} is now $${price.toFixed(2)} (target $${alert.targetPrice})`,
        );
        onUpdate(alert.id, { triggered: true });
      }
    }
  }, [currentPrices, alerts, onUpdate]);

  const handleAdd = () => {
    requestNotificationPermission();
    onAdd({
      id: Date.now().toString(),
      etf,
      targetPrice,
      above,
      triggered: false,
    });
    setTargetPrice(100);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={etf} onChange={(e) => setEtf(e.target.value)}>
          {enabledEtfs.map((e) => (
            <option key={e.symbol} value={e.symbol}>
              {e.symbol}
            </option>
          ))}
        </Select>
        <Select
          value={above ? "above" : "below"}
          onChange={(e) => setAbove(e.target.value === "above")}
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </Select>
        <Input
          type="number"
          step="1"
          value={targetPrice}
          onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
          className="w-24"
        />
        <Button onClick={handleAdd}>Set Alert</Button>
      </div>
      {alerts.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No alerts set.
        </p>
      )}
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex justify-between items-center border-t border-slate-100 py-2 dark:border-slate-800"
        >
          <span>
            {a.etf} {a.above ? "↑ above" : "↓ below"} ${a.targetPrice}
          </span>
          <Badge tone={a.triggered ? "neutral" : "gain"}>
            {a.triggered ? "Triggered" : "Active"}
          </Badge>
          <button
            onClick={() => onDelete(a.id)}
            className="text-rose-500 hover:text-rose-700 dark:text-rose-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
