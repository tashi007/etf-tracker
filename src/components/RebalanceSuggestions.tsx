import { Holding, TargetAlloc } from "../types";
import { DEFAULT_ETF_SYMBOLS } from "../types";

interface Props {
  holdings: Holding[];
  targetAlloc: TargetAlloc;
  enabledSymbols: string[];
}

export function RebalanceSuggestions({ holdings, targetAlloc, enabledSymbols }: Props) {
  const symbols = enabledSymbols.length > 0 ? enabledSymbols : DEFAULT_ETF_SYMBOLS;
  const totalValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  const driftTolerance = targetAlloc.driftTolerancePercent ?? 5;

  const allocation = symbols.map((symbol) => {
    const holding = holdings.find((entry) => entry.etf === symbol);
    const current =
      totalValue > 0 ? ((holding?.currentValue ?? 0) / totalValue) * 100 : 0;
    const target = (targetAlloc.alloc[symbol] as number) ?? 0;
    return {
      symbol,
      current,
      target,
      drift: current - target,
      value: holding?.currentValue ?? 0,
    };
  });

  const overweight = allocation
    .filter((item) => item.drift > driftTolerance)
    .sort((a, b) => b.drift - a.drift)[0];
  const underweight = allocation
    .filter((item) => item.drift < -driftTolerance)
    .sort((a, b) => a.drift - b.drift)[0];

  if (!overweight && !underweight) {
    return (
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Portfolio is within the current drift tolerance of {driftTolerance}%.
        </p>
      </div>
    );
  }

  const overweightSell = overweight
    ? Math.max(0, overweight.value - totalValue * (overweight.target / 100))
    : 0;
  const underweightBuy = underweight
    ? Math.max(0, totalValue * (underweight.target / 100) - underweight.value)
    : 0;

  return (
    <div>
      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {overweight && (
          <p>
            Sell about{" "}
            <span className="text-rose-600 dark:text-rose-400">
              ${overweightSell.toFixed(2)}
            </span>{" "}
            of <strong>{overweight.symbol}</strong>.
          </p>
        )}
        {underweight && (
          <p>
            Buy about{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              ${underweightBuy.toFixed(2)}
            </span>{" "}
            of <strong>{underweight.symbol}</strong>.
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400">
          Drift tolerance: ±{driftTolerance}%.
        </p>
      </div>
    </div>
  );
}
