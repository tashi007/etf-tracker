import { useEffect, useRef, useState } from "react";
import type {
  State,
  Transaction,
  TargetAlloc,
  Dividend,
  EtfConfig,
  PriceAlert,
  Lot,
  ReminderSchedule,
} from "../types";
import {
  DEFAULT_STATE,
  exportDatabaseBytes,
  getData as getDataFromDb,
  importDatabaseBytes,
  loadState,
  migrate,
  saveState,
} from "../db/db";
import {
  allocateSellLots,
  applySellToLots,
  applySplitToLots,
  buildLotsFromTransactions,
  createDrpLot,
} from "../utils/lots";

export function useStorage() {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const stateRef = useRef<State>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      await migrate();
      const loaded = await getDataFromDb();
      if (cancelled) return;
      stateRef.current = loaded;
      setState(loaded);
      setLoading(false);
    }

    initialize().catch((error) => {
      console.error("Failed to initialize portfolio storage", error);
      if (!cancelled) {
        stateRef.current = DEFAULT_STATE;
        setState(DEFAULT_STATE);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setData = async (newState: State) => {
    stateRef.current = newState;
    setState(newState);
    await saveState(newState);
  };

  const rebuildLots = (transactions: Transaction[]): Lot[] => {
    return buildLotsFromTransactions(transactions);
  };

  const applyTransaction = (tx: Transaction): State => {
    const currentState = stateRef.current;
    const nextTransactions = [...currentState.transactions];
    const nextLots = [
      ...(currentState.lots.length > 0
        ? currentState.lots
        : buildLotsFromTransactions(currentState.transactions)),
    ];

    if (tx.type === "BUY") {
      const lotId = tx.lotId ?? `${tx.id}-lot`;
      nextTransactions.push({ ...tx, lotId });
      nextLots.push({
        id: lotId,
        symbol: tx.etf,
        units: tx.units,
        costBasisPerUnit: tx.pricePerUnit,
        purchaseDate: tx.date,
        originalTransactionId: tx.id,
      });
      return {
        ...currentState,
        transactions: nextTransactions,
        lots: nextLots,
      };
    }

    const holdingPeriodDays = currentState.targetAlloc.holdingPeriodDays ?? 365;
    const allocations = allocateSellLots(
      nextLots,
      tx.etf,
      tx.units,
      tx.disposalMethod ?? "FIFO",
      tx.lotIds,
    );
    const soldUnits = allocations.reduce(
      (sum, allocation) => sum + allocation.units,
      0,
    );
    const adjustedTx = {
      ...tx,
      units: soldUnits,
      lotIds: allocations.map((allocation) => allocation.lotId),
    } as Transaction;

    let realizedGain = 0;
    let shortTermGain = 0;
    let longTermGain = 0;
    for (const allocation of allocations) {
      const lotGain =
        allocation.units *
        (adjustedTx.pricePerUnit - allocation.costBasisPerUnit);
      realizedGain += lotGain;
      const holdingDays =
        (new Date(adjustedTx.date).getTime() -
          new Date(allocation.purchaseDate).getTime()) /
        (1000 * 60 * 60 * 24);
      if (holdingDays >= holdingPeriodDays) {
        longTermGain += lotGain;
      } else {
        shortTermGain += lotGain;
      }
    }

    adjustedTx.realizedGain = realizedGain;
    adjustedTx.realizedShortTermGain = shortTermGain;
    adjustedTx.realizedLongTermGain = longTermGain;

    nextTransactions.push(adjustedTx);
    const remainingLots = applySellToLots(nextLots, allocations);

    return {
      ...currentState,
      transactions: nextTransactions,
      lots: remainingLots,
    };
  };

  const addTransaction = (tx: Transaction) => {
    void setData(applyTransaction(tx));
  };

  const updateTargetAlloc = (newTarget: TargetAlloc) => {
    void setData({ ...stateRef.current, targetAlloc: newTarget });
  };

  const deleteTransaction = (id: string) => {
    const nextTransactions = stateRef.current.transactions.filter(
      (t) => t.id !== id,
    );
    void setData({
      ...stateRef.current,
      transactions: nextTransactions,
      lots: rebuildLots(nextTransactions),
    });
  };

  const addDividend = (dividend: Dividend) => {
    void setData({
      ...stateRef.current,
      dividends: [...stateRef.current.dividends, dividend],
    });
  };

  const deleteDividend = (id: string) => {
    void setData({
      ...stateRef.current,
      dividends: stateRef.current.dividends.filter((d) => d.id !== id),
    });
  };

  const addPriceAlert = (alert: PriceAlert) => {
    void setData({
      ...stateRef.current,
      priceAlerts: [...stateRef.current.priceAlerts, alert],
    });
  };

  const upsertReminderSchedule = (schedule: ReminderSchedule | null) => {
    void setData({
      ...stateRef.current,
      reminderSchedules: schedule ? [schedule] : [],
    });
  };

  const applyCorporateAction = (
    action:
      | { type: "SPLIT"; etf: Transaction["etf"]; ratio: number; date: string }
      | {
          type: "DRP";
          etf: Transaction["etf"];
          dividendId: string;
          dividendAmount: number;
          reinvestmentPrice: number;
          date: string;
        },
  ) => {
    if (action.type === "SPLIT") {
      void setData({
        ...stateRef.current,
        lots: applySplitToLots(stateRef.current.lots, action.etf, action.ratio),
      });
      return;
    }

    const nextLots = [...stateRef.current.lots];
    nextLots.push(
      createDrpLot({
        symbol: action.etf,
        dividendId: action.dividendId,
        reinvestmentDate: action.date,
        reinvestmentPrice: action.reinvestmentPrice,
        dividendAmount: action.dividendAmount,
      }),
    );
    void setData({
      ...stateRef.current,
      lots: nextLots,
    });
  };

  const updatePriceAlert = (id: string, updates: Partial<PriceAlert>) => {
    void setData({
      ...stateRef.current,
      priceAlerts: stateRef.current.priceAlerts.map((a) =>
        a.id === id ? { ...a, ...updates } : a,
      ),
    });
  };

  const deletePriceAlert = (id: string) => {
    void setData({
      ...stateRef.current,
      priceAlerts: stateRef.current.priceAlerts.filter((a) => a.id !== id),
    });
  };

  const updateEtfConfigs = (configs: EtfConfig[]) => {
    void setData({ ...stateRef.current, etfConfigs: configs });
  };

  const downloadDatabase = async (): Promise<Uint8Array> => {
    return exportDatabaseBytes();
  };

  const importDatabase = async (bytes: Uint8Array): Promise<boolean> => {
    const success = await importDatabaseBytes(bytes);
    if (!success) return false;
    await setData(await loadState());
    return true;
  };

  const getData = async (): Promise<State> => getDataFromDb();

  const updateFortnightlyTarget = (alloc: Record<string, number>) => {
    const newState = {
      ...stateRef.current,
      fortnightlyTargetAlloc: alloc,
    };
    void setData(newState);
  };

  return {
    state,
    loading,
    getData,
    setData,
    addTransaction,
    updateTargetAlloc,
    updateFortnightlyTarget,
    deleteTransaction,
    addDividend,
    deleteDividend,
    addPriceAlert,
    updatePriceAlert,
    deletePriceAlert,
    upsertReminderSchedule,
    applyCorporateAction,
    updateEtfConfigs,
    downloadDatabase,
    importDatabase,
  };
}
