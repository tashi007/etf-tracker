import { useEffect, useState, useRef, Suspense, lazy } from "react";
import { useStorage } from "./hooks/useStorage";
import {
  calculateHoldings,
  calculateAllocByValue,
  getTotalInvested,
  getTotalCurrentValue,
} from "./utils/holdings";
import { fetchAllPrices, fetchHistoricalPrices } from "./utils/prices";
import {
  exportTaxLotReportToCSV,
  exportTransactionsToCSV,
} from "./utils/exportCSV";
import { useTheme } from "./context/ThemeContext";
import { requestNotificationPermission } from "./utils/notifications";
import { AllocationChart } from "./components/AllocationChart";
import { TransactionForm } from "./components/TransactionForm";
import { LoadingScreen } from "./components/LoadingScreen";
import { TransactionList } from "./components/TransactionList";
import { SegmentedControl } from "./components/ui/SegmentedControl";
import { Tabs } from "./components/ui/Tabs";
import { Card } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import { InfoPopover } from "./components/ui/InfoPopover";
import { Modal } from "./components/ui/Modal";
import { KpiGrid } from "./components/KpiGrid";
import { HoldingsTable } from "./components/HoldingsTable";
import { computePortfolioMetrics } from "./utils/portfolioMetrics";
import type { ReturnPeriod } from "./utils/returns";
import { FortnightlyPlanner } from "./components/FortnightlyPlanner";
import { TargetAllocEditor } from "./components/TargetAllocEditor";
import { DividendForm } from "./components/DividendForm";
import { DividendList } from "./components/DividendList";
import { CorporateActionForm } from "./components/CorporateActionForm";
import { RebalanceSuggestions } from "./components/RebalanceSuggestions";
import { PriceAlertSetup } from "./components/PriceAlertSetup";
import { EtfManager } from "./components/EtfManager";
import { Holding, PriceData } from "./types";
import { getEnabledSymbols } from "./db/db";
import {
  Sun,
  Moon,
  Download,
  Upload,
  FileSpreadsheet,
  Bell,
  Mail,
  Settings,
} from "lucide-react";

// Lazy-load chart components
const PortfolioValueChart = lazy(() =>
  import("./components/PortfolioValueChart").then((m) => ({
    default: m.PortfolioValueChart,
  })),
);
const BenchmarkChart = lazy(() =>
  import("./components/BenchmarkChart").then((m) => ({
    default: m.BenchmarkChart,
  })),
);

function ChartSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800" />
  );
}

function App() {
  const {
    state,
    loading,
    addTransaction,
    deleteTransaction,
    downloadDatabase,
    importDatabase,
    updateTargetAlloc,
    updateFortnightlyTarget,
    addDividend,
    deleteDividend,
    addPriceAlert,
    updatePriceAlert,
    deletePriceAlert,
    applyCorporateAction,
    upsertReminderSchedule,
    updateEtfConfigs,
  } = useStorage();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [pricesLastUpdated, setPricesLastUpdated] = useState<string>("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<
    { date: string; value: number }[]
  >([]);
  const [historyDates, setHistoryDates] = useState<{
    from: string;
    to: string;
  }>({ from: "", to: "" });
  const [suggestedTransaction, setSuggestedTransaction] = useState<{
    etf: string;
    amount: number;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [period, setPeriod] = useState<ReturnPeriod>("1Y");
  const [showAddTx, setShowAddTx] = useState(false);
  const [txSuccessVisible, setTxSuccessVisible] = useState(false);
  const txSuccessTimer = useRef<number | null>(null);
  const [chartTab, setChartTab] = useState<
    "value" | "benchmark" | "allocation"
  >("value");
  const [sidebarTab, setSidebarTab] = useState<
    "planner" | "rebalance" | "targets" | "corp" | "dividends" | "alerts"
  >("planner");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  const enabledSymbols = getEnabledSymbols(state.etfConfigs);
  const enabledSymbolsKey = enabledSymbols.join(",");
  const yahooSymbols = state.etfConfigs
    .filter((e) => e.enabled)
    .map((e) => e.yahooSymbol);
  const yahooSymbolsKey = yahooSymbols.join(",");

  // Load live prices
  useEffect(() => {
    async function loadPrices() {
      try {
        const data: PriceData[] = await fetchAllPrices(yahooSymbols);
        const priceMap: Record<string, number> = {};
        for (const p of data) priceMap[p.symbol] = p.price;
        setPrices(priceMap);
        if (data.length > 0) setPricesLastUpdated(data[0].lastUpdated);
      } catch (err) {
        console.error(err);
      }
    }
    loadPrices();
    const interval = setInterval(loadPrices, 60000);
    return () => clearInterval(interval);
  }, [yahooSymbolsKey]);

  // Recalculate holdings
  useEffect(() => {
    const newHoldings = calculateHoldings(
      state.transactions,
      prices,
      state.lots,
      enabledSymbols,
    );
    setHoldings(newHoldings);
  }, [state.transactions, state.lots, prices, enabledSymbolsKey]);

  // For benchmark chart: get date range from transactions
  useEffect(() => {
    if (state.transactions.length > 0) {
      const dates = state.transactions.map((t) => new Date(t.date));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date();
      setHistoryDates({
        from: minDate.toISOString().slice(0, 10),
        to: maxDate.toISOString().slice(0, 10),
      });
    }
  }, [state.transactions]);

  useEffect(() => {
    let cancelled = false;

    async function buildPortfolioHistory() {
      if (state.transactions.length === 0) {
        setPortfolioHistory([]);
        return;
      }

      const dates = state.transactions.map((t) => new Date(t.date));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date();
      const fromStr = minDate.toISOString().slice(0, 10);
      const toStr = maxDate.toISOString().slice(0, 10);

      const enabledEtfs = state.etfConfigs.filter((e) => e.enabled);

      const priceHistory: Record<string, { date: string; price: number }[]> =
        {};
      await Promise.all(
        enabledEtfs.map(async (etf) => {
          priceHistory[etf.symbol] = await fetchHistoricalPrices(
            etf.yahooSymbol,
            fromStr,
            toStr,
          );
        }),
      );

      const allDates = new Set<string>();
      for (const etf of enabledEtfs) {
        for (const priceEntry of priceHistory[etf.symbol] ?? []) {
          allDates.add(priceEntry.date);
        }
      }

      const sortedDates = Array.from(allDates).sort();
      const history = sortedDates.map((date) => {
        let totalValue = 0;

        for (const etf of enabledEtfs) {
          const pricesForSymbol = priceHistory[etf.symbol] ?? [];
          let price = 0;
          for (let index = pricesForSymbol.length - 1; index >= 0; index -= 1) {
            if (pricesForSymbol[index].date <= date) {
              price = pricesForSymbol[index].price;
              break;
            }
          }
          if (price === 0) continue;

          let units = 0;
          for (const tx of state.transactions) {
            if (tx.etf === etf.symbol && tx.date <= date) {
              if (tx.type === "BUY") units += tx.units;
              else if (tx.type === "SELL") units -= tx.units;
            }
          }
          totalValue += units * price;
        }

        return { date, value: totalValue };
      });

      if (!cancelled) {
        setPortfolioHistory(history);
      }
    }

    buildPortfolioHistory().catch((error) => {
      console.error("Failed to build portfolio history", error);
      if (!cancelled) setPortfolioHistory([]);
    });

    return () => {
      cancelled = true;
    };
  }, [state.transactions, state.etfConfigs]);

  const totalInvested = getTotalInvested(state.transactions);
  const totalCurrentValue = getTotalCurrentValue(holdings);
  const currentAlloc = calculateAllocByValue(holdings);

  const metrics = computePortfolioMetrics({
    holdings,
    transactions: state.transactions,
    dividends: state.dividends,
    lots: state.lots,
    portfolioHistory,
    totalInvested,
    totalCurrentValue,
    period,
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        void importDatabase(
          new Uint8Array(ev.target.result as ArrayBuffer),
        ).then((success) => {
          alert(success ? "Data imported successfully" : "Invalid file format");
        });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = async () => {
    const bytes = await downloadDatabase();
    const blob = new Blob([bytes.slice()], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etf-portfolio-${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
  };

  const emailBackup = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etf-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("File saved. You can now attach it to an email.");
  };

  const transactionCountForSymbol = (symbol: string): number => {
    return state.transactions.filter((tx) => tx.etf === symbol).length;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            ETF Portfolio Tracker
          </h1>
          {pricesLastUpdated && (
            <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
              Prices updated {new Date(pricesLastUpdated).toLocaleTimeString()}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={toggleTheme} title="Toggle theme" className="w-10 px-0">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
            <Button variant="ghost" onClick={() => setShowSettings(!showSettings)} title="ETF Settings" className="w-10 px-0">
              <Settings size={18} />
            </Button>
            <Button variant="secondary" onClick={() => void handleExport()} title="Download .db">
              <Download size={14} />
              <span className="hidden md:inline">Download .db</span>
            </Button>
            <Button variant="secondary" onClick={() => exportTransactionsToCSV(state.transactions)} title="Export CSV">
              <FileSpreadsheet size={14} />
              <span className="hidden md:inline">CSV</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                exportTaxLotReportToCSV(
                  state.transactions,
                  state.targetAlloc.holdingPeriodDays ?? 365,
                )
              }
              title="Tax lot report (CSV)"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden md:inline">Tax lot report</span>
            </Button>
            <Button variant="secondary" onClick={emailBackup} title="Backup JSON">
              <Mail size={14} />
              <span className="hidden md:inline">Backup</span>
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} title="Import .db">
              <Upload size={14} />
              <span className="hidden md:inline">Import</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".db"
              className="hidden"
            />
            <Button variant="secondary" onClick={requestNotificationPermission} title="Enable notifications">
              <Bell size={14} />
              <span className="hidden md:inline">Notify</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {showSettings && (
          <div className="mb-6">
            <EtfManager
              etfConfigs={state.etfConfigs}
              onUpdate={updateEtfConfigs}
              transactionCount={transactionCountForSymbol}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Performance
                </h2>
                <SegmentedControl
                  ariaLabel="Performance range"
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: "1M", label: "1M" },
                    { value: "3M", label: "3M" },
                    { value: "1Y", label: "1Y" },
                    { value: "5Y", label: "5Y" },
                    { value: "ITD", label: "ITD" },
                  ]}
                />
              </div>
              <KpiGrid metrics={metrics} period={period} />
            </section>

            <HoldingsTable
              holdings={holdings}
              targetAlloc={state.targetAlloc}
              enabledSymbols={enabledSymbols}
              pricesLastUpdated={pricesLastUpdated}
            />

            <div className="relative">
              <Tabs
                ariaLabel="Chart views"
                tabs={[
                  { id: "value", label: "Portfolio Value" },
                  { id: "benchmark", label: "vs S&P 500 (IVV)" },
                  { id: "allocation", label: "Allocation" },
                ]}
                active={chartTab}
                onChange={(id) =>
                  setChartTab(
                    id === "benchmark"
                      ? "benchmark"
                      : id === "allocation"
                        ? "allocation"
                        : "value",
                  )
                }
              />
              <div className="pt-4">
                {chartTab === "value" && (
                  <Suspense fallback={<ChartSkeleton />}>
                    <PortfolioValueChart
                      history={portfolioHistory}
                      period={period}
                    />
                  </Suspense>
                )}
                {chartTab === "benchmark" &&
                  (historyDates.from ? (
                    <Suspense fallback={<ChartSkeleton />}>
                      <BenchmarkChart
                        portfolioHistory={portfolioHistory}
                        fromDate={historyDates.from}
                        toDate={historyDates.to}
                      />
                    </Suspense>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Add transactions to compare against the benchmark.
                    </p>
                  ))}
                {chartTab === "allocation" && (
                  <AllocationChart
                    current={currentAlloc}
                    target={state.targetAlloc.alloc}
                  />
                )}
              </div>
              <InfoPopover
                text="Switch between portfolio value over time, benchmark comparison, and allocation breakdown."
                className="absolute bottom-2 left-2"
              />
            </div>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Transactions
                </h2>
                <Button onClick={() => setShowAddTx(true)}>+ Add Transaction</Button>
              </div>
              {txSuccessVisible && (
                <p
                  role="status"
                  className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  Transaction added.
                </p>
              )}
              <div className="mt-4">
                <TransactionList
                  transactions={state.transactions}
                  onDelete={deleteTransaction}
                />
              </div>
              <Modal
                open={showAddTx}
                title="Add Transaction"
                onClose={() => setShowAddTx(false)}
              >
                <TransactionForm
                  onAdd={(tx) => {
                    addTransaction(tx);
                    setSuggestedTransaction(null);
                    setShowAddTx(false);
                    if (txSuccessTimer.current !== null)
                      window.clearTimeout(txSuccessTimer.current);
                    setTxSuccessVisible(true);
                    txSuccessTimer.current = window.setTimeout(
                      () => setTxSuccessVisible(false),
                      4000,
                    );
                  }}
                  currentPrices={prices}
                  lots={state.lots}
                  etfConfigs={state.etfConfigs}
                  initialSuggestion={suggestedTransaction}
                />
              </Modal>
            </Card>
          </div>

          <div>
            <Card className="lg:sticky lg:top-24">
              <Tabs
                ariaLabel="Tools"
                tabs={[
                  { id: "planner", label: "Planner" },
                  { id: "rebalance", label: "Rebalance" },
                  { id: "targets", label: "Targets" },
                  { id: "corp", label: "Corp Actions" },
                  { id: "dividends", label: "Dividends" },
                  { id: "alerts", label: "Alerts" },
                ]}
                active={sidebarTab}
                onChange={(id) => setSidebarTab(id as typeof sidebarTab)}
              />
              <div className="pt-4">
                {sidebarTab === "planner" && (
                  <FortnightlyPlanner
                    holdings={holdings}
                    reminderSchedule={state.reminderSchedules[0] ?? null}
                    onReminderScheduleChange={upsertReminderSchedule}
                    fortnightlyTargetAlloc={
                      state.fortnightlyTargetAlloc ?? { VAS: 40, VGS: 60 }
                    }
                    onUpdateFortnightlyTarget={updateFortnightlyTarget}
                    etfConfigs={state.etfConfigs}
                    onUseSuggestion={(etf, amount) => {
                      setSuggestedTransaction({ etf, amount });
                      setShowAddTx(true);
                    }}
                  />
                )}
                {sidebarTab === "rebalance" && (
                  <RebalanceSuggestions
                    holdings={holdings}
                    targetAlloc={state.targetAlloc}
                    enabledSymbols={enabledSymbols}
                  />
                )}
                {sidebarTab === "targets" && (
                  <TargetAllocEditor
                    targetAlloc={state.targetAlloc}
                    enabledSymbols={enabledSymbols}
                    onUpdate={updateTargetAlloc}
                  />
                )}
                {sidebarTab === "corp" && (
                  <CorporateActionForm
                    dividends={state.dividends}
                    currentPrices={prices}
                    etfConfigs={state.etfConfigs}
                    onApplyCorporateAction={applyCorporateAction}
                  />
                )}
                {sidebarTab === "dividends" && (
                  <div className="space-y-4">
                    <DividendForm onAdd={addDividend} etfConfigs={state.etfConfigs} />
                    <DividendList
                      dividends={state.dividends}
                      onDelete={deleteDividend}
                    />
                  </div>
                )}
                {sidebarTab === "alerts" && (
                  <PriceAlertSetup
                    alerts={state.priceAlerts}
                    currentPrices={prices}
                    etfConfigs={state.etfConfigs}
                    onAdd={addPriceAlert}
                    onUpdate={updatePriceAlert}
                    onDelete={deletePriceAlert}
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
