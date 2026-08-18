import { DisposalMethod, EtfSymbol, Lot, Transaction, DEFAULT_ETF_SYMBOLS } from "../types";

export interface SellAllocation {
  lotId: string;
  units: number;
  costBasisPerUnit: number;
  purchaseDate: string;
}

export interface TaxLotReportRow {
  saleTransactionId: string;
  saleDate: string;
  symbol: EtfSymbol;
  lotId: string;
  purchaseDate: string;
  units: number;
  salePricePerUnit: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  isLongTerm: boolean;
  disposalMethod: DisposalMethod;
}

export function cloneLots(lots: Lot[]): Lot[] {
  return lots.map((lot) => ({ ...lot }));
}

export function buildLotsFromTransactions(transactions: Transaction[]): Lot[] {
  const lots: Lot[] = [];
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const tx of sorted) {
    if (tx.type === "BUY") {
      lots.push({
        id: tx.lotId || tx.id,
        symbol: tx.etf,
        units: tx.units,
        costBasisPerUnit: tx.pricePerUnit,
        purchaseDate: tx.date,
        originalTransactionId: tx.id,
      });
      continue;
    }

    const allocations = allocateSellLots(
      lots,
      tx.etf,
      tx.units,
      tx.disposalMethod ?? "FIFO",
      tx.lotIds,
    );
    for (const allocation of allocations) {
      const lot = lots.find((entry) => entry.id === allocation.lotId);
      if (!lot) continue;
      lot.units = Math.max(0, lot.units - allocation.units);
    }
  }

  return lots.filter((lot) => lot.units > 0);
}

export function getActiveLots(lots: Lot[]): Lot[] {
  return lots.filter((lot) => lot.units > 0);
}

export function getLotsBySymbol(lots: Lot[], symbol: EtfSymbol): Lot[] {
  return getActiveLots(lots).filter((lot) => lot.symbol === symbol);
}

export function allocateSellLots(
  lots: Lot[],
  symbol: EtfSymbol,
  sellUnits: number,
  method: DisposalMethod,
  selectedLotIds?: string[],
): SellAllocation[] {
  const availableLots = getLotsBySymbol(lots, symbol);
  let orderedLots = availableLots;

  if (method === "HIFO") {
    orderedLots = [...availableLots].sort(
      (a, b) => b.costBasisPerUnit - a.costBasisPerUnit,
    );
  } else if (method === "FIFO") {
    orderedLots = [...availableLots].sort(
      (a, b) =>
        new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime(),
    );
  } else if (selectedLotIds && selectedLotIds.length > 0) {
    orderedLots = selectedLotIds
      .map((id) => availableLots.find((lot) => lot.id === id))
      .filter((lot): lot is Lot => Boolean(lot));
  }

  const allocations: SellAllocation[] = [];
  let remaining = sellUnits;

  for (const lot of orderedLots) {
    if (remaining <= 0) break;
    const units = Math.min(lot.units, remaining);
    allocations.push({
      lotId: lot.id,
      units,
      costBasisPerUnit: lot.costBasisPerUnit,
      purchaseDate: lot.purchaseDate,
    });
    remaining -= units;
  }

  return allocations;
}

export function applySellToLots(
  lots: Lot[],
  allocations: SellAllocation[],
): Lot[] {
  const nextLots = cloneLots(lots);
  for (const allocation of allocations) {
    const lot = nextLots.find((entry) => entry.id === allocation.lotId);
    if (!lot) continue;
    lot.units = Math.max(0, lot.units - allocation.units);
  }
  return nextLots.filter((lot) => lot.units > 0);
}

export function applySplitToLots(
  lots: Lot[],
  symbol: EtfSymbol,
  ratio: number,
): Lot[] {
  if (ratio <= 0) return cloneLots(lots);
  return lots.map((lot) => {
    if (lot.symbol !== symbol) return { ...lot };
    return {
      ...lot,
      units: lot.units * ratio,
      costBasisPerUnit: lot.costBasisPerUnit / ratio,
    };
  });
}

export function createDrpLot(input: {
  symbol: EtfSymbol;
  dividendId: string;
  reinvestmentDate: string;
  reinvestmentPrice: number;
  dividendAmount: number;
  sourceLotId?: string;
}): Lot {
  const units =
    input.reinvestmentPrice > 0
      ? input.dividendAmount / input.reinvestmentPrice
      : 0;
  return {
    id: `${input.dividendId}-drp-${Date.now()}`,
    symbol: input.symbol,
    units,
    costBasisPerUnit: input.reinvestmentPrice,
    purchaseDate: input.reinvestmentDate,
    linkedDividendId: input.dividendId,
    originalTransactionId: input.sourceLotId,
  };
}

export function buildTaxLotReportRows(
  transactions: Transaction[],
  holdingPeriodDays = 365,
): TaxLotReportRow[] {
  const lots: Lot[] = [];
  const rows: TaxLotReportRow[] = [];
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const tx of sorted) {
    if (tx.type === "BUY") {
      lots.push({
        id: tx.lotId || tx.id,
        symbol: tx.etf,
        units: tx.units,
        costBasisPerUnit: tx.pricePerUnit,
        purchaseDate: tx.date,
        originalTransactionId: tx.id,
      });
      continue;
    }

    const allocations = allocateSellLots(
      lots,
      tx.etf,
      tx.units,
      tx.disposalMethod ?? "FIFO",
      tx.lotIds,
    );

    for (const allocation of allocations) {
      const proceeds = allocation.units * tx.pricePerUnit;
      const costBasis = allocation.units * allocation.costBasisPerUnit;
      const holdingDays =
        (new Date(tx.date).getTime() -
          new Date(allocation.purchaseDate).getTime()) /
        (1000 * 60 * 60 * 24);

      rows.push({
        saleTransactionId: tx.id,
        saleDate: tx.date,
        symbol: tx.etf,
        lotId: allocation.lotId,
        purchaseDate: allocation.purchaseDate,
        units: allocation.units,
        salePricePerUnit: tx.pricePerUnit,
        proceeds,
        costBasis,
        gain: proceeds - costBasis,
        isLongTerm: holdingDays >= holdingPeriodDays,
        disposalMethod: tx.disposalMethod ?? "FIFO",
      });
    }

    const remainingLots = applySellToLots(lots, allocations);
    lots.length = 0;
    lots.push(...remainingLots);
  }

  return rows;
}

export function getEtfSymbols(): readonly string[] {
  return DEFAULT_ETF_SYMBOLS;
}
