import { Holding, Lot, Transaction } from "../types";
import { buildLotsFromTransactions } from "./lots";

export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number>,
  lots: Lot[] = [],
  enabledSymbols?: string[],
): Holding[] {
  const activeLots =
    lots.length > 0 ? lots : buildLotsFromTransactions(transactions);

  const symbols = enabledSymbols ?? getEnabledSymbolsFromTransactions(transactions);

  const etfData: Record<
    string,
    {
      units: number;
      totalCost: number;
      realizedGain: number;
      shortTermGain: number;
      longTermGain: number;
    }
  > = {};

  for (const symbol of symbols) {
    etfData[symbol] = {
      units: 0,
      totalCost: 0,
      realizedGain: 0,
      shortTermGain: 0,
      longTermGain: 0,
    };
  }

  for (const lot of activeLots) {
    if (!etfData[lot.symbol]) {
      etfData[lot.symbol] = {
        units: 0,
        totalCost: 0,
        realizedGain: 0,
        shortTermGain: 0,
        longTermGain: 0,
      };
    }
    etfData[lot.symbol].units += lot.units;
    etfData[lot.symbol].totalCost += lot.units * lot.costBasisPerUnit;
  }

  for (const tx of transactions) {
    if (tx.type !== "SELL") continue;
    const data = etfData[tx.etf];
    if (!data) continue;
    data.realizedGain += Number(tx.realizedGain) || 0;
    data.shortTermGain += Number(tx.realizedShortTermGain) || 0;
    data.longTermGain += Number(tx.realizedLongTermGain) || 0;
  }

  const holdings: Holding[] = [];
  for (const symbol of symbols) {
    const data = etfData[symbol];
    if (!data) continue;
    const avgCost = data.units > 0 ? data.totalCost / data.units : 0;
    const currentPrice = currentPrices[symbol] || 0;
    const currentValue = data.units * currentPrice;
    const unrealizedGainLoss = currentValue - data.totalCost;

    holdings.push({
      etf: symbol,
      totalUnits: data.units,
      totalCost: data.totalCost,
      averageCost: avgCost,
      currentPrice,
      currentValue,
      unrealizedGainLoss,
      realizedGainLossTotal: data.realizedGain,
      realizedShortTermGainLoss: data.shortTermGain,
      realizedLongTermGainLoss: data.longTermGain,
    });
  }

  return holdings;
}

function getEnabledSymbolsFromTransactions(transactions: Transaction[]): string[] {
  const symbols = new Set<string>();
  for (const tx of transactions) symbols.add(tx.etf);
  return Array.from(symbols);
}

export function calculateAllocByValue(
  holdings: Holding[],
): Record<string, number> {
  const total = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (total === 0) {
    const zero: Record<string, number> = {};
    for (const h of holdings) zero[h.etf] = 0;
    return zero;
  }
  const alloc: Record<string, number> = {};
  for (const h of holdings) {
    alloc[h.etf] = (h.currentValue / total) * 100;
  }
  return alloc;
}

export function getTotalInvested(transactions: Transaction[]): number {
  let total = 0;
  for (const tx of transactions) {
    const units = Number(tx.units) || 0;
    const price = Number(tx.pricePerUnit) || 0;
    if (tx.type === "BUY") {
      total += units * price;
    } else if (tx.type === "SELL") {
      total -= units * price; // net invested reduces on sell
    }
  }
  return Math.max(0, total);
}

export function getTotalCurrentValue(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.currentValue, 0);
}

export function getTotalRealizedGain(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.realizedGainLossTotal, 0);
}
