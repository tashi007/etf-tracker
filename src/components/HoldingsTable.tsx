import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";
import { Holding, TargetAlloc } from "../types";
import { money } from "../utils/money";

interface Props {
  holdings: Holding[];
  targetAlloc: TargetAlloc;
  enabledSymbols: string[];
  pricesLastUpdated: string;
}

export function HoldingsTable({
  holdings,
  targetAlloc,
  enabledSymbols,
  pricesLastUpdated,
}: Props) {
  const totalCurrentValue = holdings.reduce(
    (sumH, h) => sumH + h.currentValue,
    0,
  );
  const driftTolerance = targetAlloc.driftTolerancePercent ?? 5;

  return (
    <Card
      title="Holdings"
      info="Live position sizes and values at latest prices. Drift compares each ETF's actual weight to its target: IN means within tolerance."
    >
      <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ETF</th>
              <th className="px-3 py-2 text-right font-medium">Units</th>
              <th className="px-3 py-2 text-right font-medium">Avg Cost</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
              <th className="px-3 py-2 text-right font-medium">P&amp;L</th>
              <th className="px-3 py-2 text-right font-medium">Drift</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const target = enabledSymbols.includes(h.etf)
                ? ((targetAlloc.alloc[h.etf] as number) ?? 0)
                : 0;
              const currentAllocation =
                totalCurrentValue > 0
                  ? (h.currentValue / totalCurrentValue) * 100
                  : 0;
              const drift = currentAllocation - target;
              const outOfTolerance = Math.abs(drift) > driftTolerance;
              return (
                <tr
                  key={h.etf}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                    {h.etf}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {h.totalUnits.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {money(h.averageCost)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {money(h.currentPrice)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {money(h.currentValue)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium tabular-nums ${
                      h.unrealizedGainLoss >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {money(h.unrealizedGainLoss)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Badge tone={outOfTolerance ? "warn" : "neutral"}>
                      {outOfTolerance
                        ? `OUT ±${Math.abs(drift).toFixed(1)}%`
                        : "IN"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {holdings.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  No holdings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Holdings outside the ±{driftTolerance}% drift tolerance are flagged.
        {pricesLastUpdated &&
          ` Prices updated ${new Date(pricesLastUpdated).toLocaleTimeString()}.`}
      </p>
    </Card>
  );
}
