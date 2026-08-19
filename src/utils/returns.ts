import { Dividend, Lot, Transaction } from "../types";

export type ReturnPeriod = "1M" | "3M" | "1Y" | "5Y" | "ITD";

export interface DailyValuation {
  date: string;
  value: number;
}

export interface ReturnMetrics {
  timeWeightedReturn: number;
  moneyWeightedReturn: number;
  startDate: string;
  endDate: string;
}

interface CashFlow {
  date: string;
  portfolioAmount: number;
  investorAmount: number;
}

interface NormalizedCashFlow extends CashFlow {
  mappedDate: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function getPeriodStartDate(
  endDate: string,
  period: ReturnPeriod,
): string {
  if (period === "ITD") {
    return "";
  }
  const end = new Date(endDate);
  const start = new Date(end);
  if (period === "1M") start.setMonth(start.getMonth() - 1);
  if (period === "3M") start.setMonth(start.getMonth() - 3);
  if (period === "1Y") start.setFullYear(start.getFullYear() - 1);
  if (period === "5Y") start.setFullYear(start.getFullYear() - 5);
  return start.toISOString().slice(0, 10);
}

function toCashFlows(
  transactions: Transaction[],
  dividends: Dividend[],
): CashFlow[] {
  const flows: CashFlow[] = [];

  for (const tx of transactions) {
    const amount = tx.units * tx.pricePerUnit;
    if (tx.type === "BUY") {
      flows.push({
        date: tx.date,
        portfolioAmount: amount,
        investorAmount: -amount,
      });
    } else {
      flows.push({
        date: tx.date,
        portfolioAmount: -amount,
        investorAmount: amount,
      });
    }
  }

  for (const dividend of dividends) {
    flows.push({
      date: dividend.payDate,
      portfolioAmount: dividend.amountPerUnit * dividend.unitsHeldAtExDate,
      investorAmount: dividend.amountPerUnit * dividend.unitsHeldAtExDate,
    });
  }

  return flows;
}

function toDrpCashFlows(lots: Lot[], dividends: Dividend[]): CashFlow[] {
  const dividendById = new Map(
    dividends.map((dividend) => [dividend.id, dividend]),
  );
  const flows: CashFlow[] = [];

  for (const lot of lots) {
    if (!lot.linkedDividendId) continue;
    const linkedDividend = dividendById.get(lot.linkedDividendId);
    const date = linkedDividend?.payDate ?? lot.purchaseDate;
    const amount = -(lot.units * lot.costBasisPerUnit);
    if (amount !== 0) {
      flows.push({
        date,
        portfolioAmount: amount,
        investorAmount: amount,
      });
    }
  }

  return flows;
}

function filterByDate<T extends { date: string }>(
  items: T[],
  startDate: string,
  endDate: string,
): T[] {
  return items.filter((item) => item.date >= startDate && item.date <= endDate);
}

function groupCashFlowsByDate(flows: CashFlow[]): Record<string, number> {
  return flows.reduce<Record<string, number>>((accumulator, flow) => {
    accumulator[flow.date] =
      (accumulator[flow.date] ?? 0) + flow.portfolioAmount;
    return accumulator;
  }, {});
}

function mapCashFlowsToTradingDates(
  flows: CashFlow[],
  tradingDates: string[],
): NormalizedCashFlow[] {
  return flows
    .map((flow) => {
      const mappedDate =
        tradingDates.find((date) => date >= flow.date) ??
        tradingDates[tradingDates.length - 1];
      return { ...flow, mappedDate };
    })
    .filter((flow) => Boolean(flow.mappedDate));
}

function expandToDailySeries(valuations: DailyValuation[]): DailyValuation[] {
  if (valuations.length === 0) return [];

  const sorted = [...valuations].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(sorted.map((entry) => [entry.date, entry.value]));
  const start = new Date(sorted[0].date);
  const end = new Date(sorted[sorted.length - 1].date);

  const series: DailyValuation[] = [];
  let lastValue = sorted[0].value;
  const current = new Date(start);

  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    const value = byDate.get(date);
    if (value !== undefined) {
      lastValue = value;
    }
    series.push({ date, value: lastValue });
    current.setDate(current.getDate() + 1);
  }

  return series;
}

function calculateTimeWeightedReturn(
  valuations: DailyValuation[],
  flowsByDate: Record<string, number>,
): number {
  if (valuations.length < 2) return 0;

  let growthFactor = 1;
  for (let index = 1; index < valuations.length; index += 1) {
    const previous = valuations[index - 1];
    const current = valuations[index];
    const flow = flowsByDate[current.date] ?? 0;
    if (previous.value <= 0) continue;
    const dayReturn = (current.value - previous.value - flow) / previous.value;
    growthFactor *= 1 + dayReturn;
  }

  return growthFactor - 1;
}

function npv(
  rate: number,
  cashFlows: Array<{ timeInYears: number; amount: number }>,
): number {
  return cashFlows.reduce(
    (sum, flow) => sum + flow.amount / Math.pow(1 + rate, flow.timeInYears),
    0,
  );
}

function calculateMoneyWeightedReturn(
  cashFlows: Array<{ timeInYears: number; amount: number }>,
): number {
  if (cashFlows.length < 2) return 0;

  let lower = -0.9999;
  let upper = 10;
  let lowerValue = npv(lower, cashFlows);
  let upperValue = npv(upper, cashFlows);

  for (
    let attempt = 0;
    attempt < 10 && lowerValue * upperValue > 0;
    attempt += 1
  ) {
    upper *= 2;
    upperValue = npv(upper, cashFlows);
  }

  if (lowerValue * upperValue > 0) return 0;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const mid = (lower + upper) / 2;
    const midValue = npv(mid, cashFlows);
    if (Math.abs(midValue) < 1e-7) return mid;
    if (lowerValue * midValue < 0) {
      upper = mid;
      upperValue = midValue;
    } else {
      lower = mid;
      lowerValue = midValue;
    }
  }

  return (lower + upper) / 2;
}

export function calculateReturnMetrics(
  valuations: DailyValuation[],
  transactions: Transaction[],
  dividends: Dividend[],
  period: ReturnPeriod,
  lots: Lot[] = [],
): ReturnMetrics {
  if (valuations.length === 0) {
    return {
      timeWeightedReturn: 0,
      moneyWeightedReturn: 0,
      startDate: "",
      endDate: "",
    };
  }

  const sortedValuations = [...valuations].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const expandedValuations = expandToDailySeries(sortedValuations);
  const endDate = expandedValuations[expandedValuations.length - 1].date;
  const requestedStart = getPeriodStartDate(endDate, period);
  const startDate =
    period === "ITD"
      ? expandedValuations[0].date
      : (expandedValuations.find((entry) => entry.date >= requestedStart)
          ?.date ?? expandedValuations[0].date);
  const periodValuations = filterByDate(expandedValuations, startDate, endDate);

  const tradingDates = sortedValuations.map((entry) => entry.date);

  const rawFlows = [
    ...toCashFlows(transactions, dividends),
    ...toDrpCashFlows(lots, dividends),
  ].filter((flow) => flow.date >= startDate && flow.date <= endDate);
  const mappedFlows = mapCashFlowsToTradingDates(rawFlows, tradingDates).filter(
    (flow) => flow.mappedDate >= startDate && flow.mappedDate <= endDate,
  );
  const flowsByDate = groupCashFlowsByDate(
    mappedFlows.map((flow) => ({
      date: flow.mappedDate,
      portfolioAmount: flow.portfolioAmount,
      investorAmount: flow.investorAmount,
    })),
  );
  const twr = calculateTimeWeightedReturn(periodValuations, flowsByDate);

  const investmentCashFlows = mappedFlows.map((flow) => ({
    timeInYears:
      (new Date(flow.mappedDate).getTime() - new Date(startDate).getTime()) /
      (DAY_MS * 365.25),
    amount: flow.investorAmount,
  }));
  investmentCashFlows.push({
    timeInYears:
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (DAY_MS * 365.25),
    amount: periodValuations[periodValuations.length - 1].value,
  });

  const mwr = calculateMoneyWeightedReturn(investmentCashFlows);

  return {
    timeWeightedReturn: twr,
    moneyWeightedReturn: mwr,
    startDate,
    endDate,
  };
}
