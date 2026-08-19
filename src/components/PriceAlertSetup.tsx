import { useState, useEffect } from "react";
import { PriceAlert, EtfConfig } from "../types";
import { requestNotificationPermission } from "../utils/notifications";
import { Trash2 } from "lucide-react";
import { sendNotification } from "../utils/notifications";

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
    // Check alerts against current prices
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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mt-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        Price Alerts
      </h3>
      <div className="flex flex-wrap gap-2 mb-3">
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
        <select
          value={above ? "above" : "below"}
          onChange={(e) => setAbove(e.target.value === "above")}
          className="border rounded p-1 dark:bg-gray-700"
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input
          type="number"
          step="1"
          value={targetPrice}
          onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
          className="border rounded p-1 w-24 dark:bg-gray-700"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
        >
          Set Alert
        </button>
      </div>
      {alerts.length === 0 && (
        <p className="text-sm text-gray-500">No alerts set.</p>
      )}
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex justify-between items-center border-t dark:border-gray-700 py-2"
        >
          <span>
            {a.etf} {a.above ? "↑ above" : "↓ below"} ${a.targetPrice}
          </span>
          <span
            className={`text-xs ${a.triggered ? "text-gray-400" : "text-green-600"}`}
          >
            {a.triggered ? "Triggered" : "Active"}
          </span>
          <button onClick={() => onDelete(a.id)} className="text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
