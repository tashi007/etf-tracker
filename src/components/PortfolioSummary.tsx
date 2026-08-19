import { useState } from "react";
import {
  Holding,
  Transaction,
  Dividend,
  TargetAlloc,
  Lot,
  EtfConfig,
} from "../types";
import { calculateCAGR, getFirstTransactionDate } from "../utils/performance";
import {
  calculateReturnMetrics,
  DailyValuation,
  ReturnPeriod,
} from "../utils/returns";

interface Props {
  holdings: Holding[];
  transactions: Transaction[];
  totalInvested: number;
  totalCurrentValue: number;
  dividends: Dividend[];
  targetAlloc: TargetAlloc;
  lots: Lot[];
  etfConfigs: EtfConfig[];
  portfolioHistory: DailyValuation[];
  pricesLastUpdated: string;
}

export function PortfolioSummary({
  holdings,
  transactions,
  totalInvested,
  totalCurrentValue,
  dividends,
  targetAlloc,
  lots,
  etfConfigs,
  portfolioHistory,
  pricesLastUpdated,
}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<ReturnPeriod>("1Y");
  const enabledSymbols = etfConfigs.filter((e) => e.enabled).map((e) => e.symbol);

  const overallGainLoss = totalCurrentValue - totalInvested;
  const overallReturnPct =
    totalInvested > 0 ? (overallGainLoss / totalInvested) * 100 : 0;
  const firstDate = getFirstTransactionDate(transactions || []);
  const cagr = calculateCAGR(totalInvested, totalCurrentValue, firstDate);
  const totalRealizedGain = holdings.reduce(
    (sum, h) => sum + h.realizedGainLossTotal,
    0,
  );
  const totalShortTermGain = holdings.reduce(
    (sum, h) => sum + h.realizedShortTermGainLoss,
    0,
  );
  const totalLongTermGain = holdings.reduce(
    (sum, h) => sum + h.realizedLongTermGainLoss,
    0,
  );
  const totalUnrealizedGain = holdings.reduce(
    (sum, h) => sum + h.unrealizedGainLoss,
    0,
  );
  const totalDividends = dividends.reduce(
    (sum, d) => sum + d.amountPerUnit * d.unitsHeldAtExDate,
    0,
  );
  const driftTolerance = targetAlloc.driftTolerancePercent ?? 5;
  const returnMetrics = calculateReturnMetrics(
    portfolioHistory,
    transactions,
    dividends,
    selectedPeriod,
    lots,
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio Summary
        </h3>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Return period</span>
        {(["1M", "3M", "1Y", "5Y", "ITD"] as ReturnPeriod[]).map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setSelectedPeriod(period)}
            className={`rounded border px-3 py-1 text-sm ${
              selectedPeriod === period
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            {period}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500">TWR ({selectedPeriod})</p>
          <p className="text-xl font-bold text-blue-600">
            {(returnMetrics.timeWeightedReturn * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">MWR ({selectedPeriod})</p>
          <p className="text-xl font-bold text-blue-600">
            {(returnMetrics.moneyWeightedReturn * 100).toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-500">Total Invested</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${totalInvested.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Current Value</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${totalCurrentValue.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Unrealized P&L</p>
          <p
            className={`text-xl font-bold ${totalUnrealizedGain >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ${totalUnrealizedGain.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Realized P&L</p>
          <p
            className={`text-xl font-bold ${totalRealizedGain >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ${totalRealizedGain.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Short-term Realized</p>
          <p
            className={`text-xl font-bold ${totalShortTermGain >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ${totalShortTermGain.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Long-term Realized</p>
          <p
            className={`text-xl font-bold ${totalLongTermGain >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ${totalLongTermGain.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Dividends Received</p>
          <p className="text-xl font-bold text-blue-600">
            ${totalDividends.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">CAGR (approx)</p>
          <p
            className={`text-xl font-bold ${cagr >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {(cagr * 100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Return</p>
          <p
            className={`text-xl font-bold ${overallReturnPct >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {overallReturnPct.toFixed(2)}%
          </p>
        </div>
      </div>
      <h4 className="font-medium mb-2 text-gray-900 dark:text-white">
        Holdings
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b dark:border-gray-700">
            <tr>
              <th className="text-left py-2">ETF</th>
              <th className="text-right">Units</th>
              <th className="text-right">Avg Cost</th>
              <th className="text-right">Current Price</th>
              <th className="text-right">Value</th>
              <th className="text-right">Unrealized P&L</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const target =
                enabledSymbols.includes(h.etf)
                  ? ((targetAlloc.alloc[h.etf] as number) ?? 0)
                  : 0;
              const currentAllocation =
                totalCurrentValue > 0
                  ? (h.currentValue / totalCurrentValue) * 100
                  : 0;
              const drift = currentAllocation - target;
              const isOutOfTolerance = Math.abs(drift) > driftTolerance;

              return (
                <tr
                  key={h.etf}
                  className={`border-b dark:border-gray-700 ${
                    isOutOfTolerance ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
                  }`}
                >
                  <td className="py-2 font-medium">{h.etf}</td>
                  <td className="text-right">{h.totalUnits.toFixed(4)}</td>
                  <td className="text-right">${h.averageCost.toFixed(2)}</td>
                  <td className="text-right">${h.currentPrice.toFixed(2)}</td>
                  <td className="text-right">${h.currentValue.toFixed(2)}</td>
                  <td
                    className={`text-right ${h.unrealizedGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    ${h.unrealizedGainLoss.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Holdings outside the ±{driftTolerance}% drift tolerance are highlighted.
      </p>
      {pricesLastUpdated && (
        <p className="text-xs text-gray-400 mt-2">
          Prices updated:{" "}
          {new Date(pricesLastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
