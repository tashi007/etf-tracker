import { useState, Suspense, lazy } from "react";
import { Holding, EtfConfig } from "../types";
import { ReminderSchedule } from "../types";
import { useEffect } from "react";
import {
  requestNotificationPermission,
  sendNotification,
} from "../utils/notifications";
import { calculateBuyRecommendation } from "../utils/recommendation";
import { Input } from "./ui/Field";
import { Button } from "./ui/Button";

const ProjectionChart = lazy(() =>
  import("./ProjectionChart").then((m) => ({
    default: m.ProjectionChart,
  })),
);

function ChartSkeleton() {
  return (
    <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
  );
}

const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;
interface Props {
  holdings: Holding[];
  reminderSchedule: ReminderSchedule | null;
  onReminderScheduleChange: (schedule: ReminderSchedule | null) => void;
  fortnightlyTargetAlloc: Record<string, number>;
  onUpdateFortnightlyTarget: (alloc: Record<string, number>) => void;
  etfConfigs: EtfConfig[];
  onUseSuggestion: (etf: string, amount: number) => void;
}

export function FortnightlyPlanner({
  holdings,
  reminderSchedule,
  onReminderScheduleChange,
  fortnightlyTargetAlloc,
  onUpdateFortnightlyTarget,
  etfConfigs,
  onUseSuggestion,
}: Props) {
  const [fortnightlyAmount, setFortnightlyAmount] = useState(1000);
  const enabledEtfs = etfConfigs.filter((e) => e.enabled);

  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

  const currentPct: Record<string, number> = {};
  for (const h of holdings) {
    currentPct[h.etf] =
      totalPortfolioValue > 0
        ? (h.currentValue / totalPortfolioValue) * 100
        : 0;
  }

  const recommendation = calculateBuyRecommendation(
    holdings,
    fortnightlyAmount,
    fortnightlyTargetAlloc,
  );

  useEffect(() => {
    if (!reminderSchedule?.enabled) return;

    let cancelled = false;

    const checkReminder = async () => {
      const now = Date.now();
      const nextTrigger = new Date(reminderSchedule.nextTriggerAt).getTime();
      if (Number.isNaN(nextTrigger) || now < nextTrigger) return;

      if (Notification.permission !== "granted") return;

      sendNotification(
        "ETF contribution reminder",
        `Time to add your fortnightly contribution of $${reminderSchedule.amount.toFixed(2)}.`,
      );

      if (cancelled) return;

      const nextSchedule: ReminderSchedule = {
        ...reminderSchedule,
        amount: fortnightlyAmount,
        lastTriggeredAt: new Date().toISOString(),
        nextTriggerAt: new Date(nextTrigger + FORTNIGHT_MS).toISOString(),
      };
      onReminderScheduleChange(nextSchedule);
    };

    void checkReminder();
    const interval = setInterval(() => void checkReminder(), 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fortnightlyAmount, onReminderScheduleChange, reminderSchedule]);

  const handleReminderToggle = async () => {
    const nextEnabled = !reminderSchedule?.enabled;
    if (!nextEnabled) {
      onReminderScheduleChange(
        reminderSchedule
          ? { ...reminderSchedule, enabled: false, amount: fortnightlyAmount }
          : null,
      );
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) return;

    const nextSchedule: ReminderSchedule = reminderSchedule ?? {
      id: "fortnightly-reminder",
      enabled: true,
      amount: fortnightlyAmount,
      intervalDays: 14,
      nextTriggerAt: new Date(Date.now() + FORTNIGHT_MS).toISOString(),
    };

    onReminderScheduleChange({
      ...nextSchedule,
      enabled: true,
      amount: fortnightlyAmount,
      intervalDays: 14,
      nextTriggerAt:
        nextSchedule.nextTriggerAt &&
        !Number.isNaN(Date.parse(nextSchedule.nextTriggerAt))
          ? nextSchedule.nextTriggerAt
          : new Date(Date.now() + FORTNIGHT_MS).toISOString(),
    });
  };

  const handleAmountChange = (nextAmount: number) => {
    setFortnightlyAmount(nextAmount);
    if (reminderSchedule) {
      onReminderScheduleChange({
        ...reminderSchedule,
        amount: nextAmount,
      });
    }
  };

  const handleTargetChange = (symbol: string, value: number) => {
    onUpdateFortnightlyTarget({
      ...fortnightlyTargetAlloc,
      [symbol]: Math.max(0, Math.min(100, value)),
    });
  };

  const targetSum = Object.values(fortnightlyTargetAlloc).reduce(
    (sum, v) => sum + (v ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <label className="block text-sm font-medium">
          Fortnightly investment ($)
        </label>
        <Input
          value={fortnightlyAmount}
          onChange={(e) => handleAmountChange(Number(e.target.value))}
          type="number"
          className="w-40"
        />
      </div>

      <div className="mb-4 rounded-lg bg-indigo-50 p-3 dark:bg-indigo-500/10">
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Target allocation for fortnightly buys
        </label>
        <div className="grid grid-cols-2 gap-2">
          {enabledEtfs.map((etf) => (
            <div key={etf.symbol} className="flex items-center gap-2">
              <label className="w-12 text-xs text-slate-600 dark:text-slate-300">
                {etf.symbol} %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={fortnightlyTargetAlloc[etf.symbol] ?? 0}
                onChange={(e) =>
                  handleTargetChange(etf.symbol, Number(e.target.value))
                }
                className="w-16 rounded-lg border border-slate-300 bg-white p-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {Math.abs(targetSum - 100) < 0.01 ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Valid (sums to 100%)
            </span>
          ) : (
            <span className="font-medium text-rose-600 dark:text-rose-400">
              Must sum to 100% (currently {targetSum.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-lg bg-slate-100 p-3 dark:bg-slate-800/60">
        <p className="text-sm font-medium mb-2">Current allocation:</p>
        <div className="grid grid-cols-2 gap-1 text-sm text-slate-600 dark:text-slate-300">
          {enabledEtfs.map((etf) => {
            const value =
              holdings.find((h) => h.etf === etf.symbol)?.currentValue ?? 0;
            const pct = currentPct[etf.symbol] ?? 0;
            return (
              <span key={etf.symbol}>
                {etf.symbol}: {pct.toFixed(1)}% (${value.toFixed(2)})
              </span>
            );
          })}
        </div>
      </div>

      {recommendation.symbol && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="font-medium text-sm mb-2">Buy Recommendation:</p>
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {recommendation.symbol}
            </span>
            <span className="text-lg font-semibold">
              ${recommendation.amount.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 mb-3">{recommendation.reason}</p>
          <Button
            className="w-full"
            onClick={() =>
              onUseSuggestion(recommendation.symbol, recommendation.amount)
            }
          >
            Use this suggestion
          </Button>
        </div>
      )}

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          checked={reminderSchedule?.enabled ?? false}
          onChange={() => void handleReminderToggle()}
          className="accent-indigo-600"
        />
        Remind me every fortnight
      </label>

      <Suspense fallback={<ChartSkeleton />}>
        <ProjectionChart
          holdings={holdings}
          fortnightlyContribution={fortnightlyAmount}
        />
      </Suspense>
    </div>
  );
}
