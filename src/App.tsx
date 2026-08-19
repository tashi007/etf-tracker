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
import { PortfolioSummary } from "./components/PortfolioSummary";
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
    <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ETF Portfolio Tracker
          </h1>
          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded bg-gray-200 dark:bg-gray-700"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded bg-gray-200 dark:bg-gray-700"
              title="ETF Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => void handleExport()}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              <Download size={14} className="inline mr-1" /> Download .db
            </button>
            <button
              onClick={() => exportTransactionsToCSV(state.transactions)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              <FileSpreadsheet size={14} className="inline mr-1" /> CSV
            </button>
            <button
              onClick={() =>
                exportTaxLotReportToCSV(
                  state.transactions,
                  state.targetAlloc.holdingPeriodDays ?? 365,
                )
              }
              className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700"
            >
              Tax lot report (CSV)
            </button>
            <button
              onClick={emailBackup}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              <Mail size={14} className="inline mr-1" /> Backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              <Upload size={14} className="inline mr-1" /> Import
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".db"
              className="hidden"
            />
            <button
              onClick={requestNotificationPermission}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
            >
              <Bell size={14} className="inline mr-1" /> Notify
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-6">
            <EtfManager
              etfConfigs={state.etfConfigs}
              onUpdate={updateEtfConfigs}
              transactionCount={transactionCountForSymbol}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <PortfolioSummary
              holdings={holdings}
              transactions={state.transactions}
              totalInvested={totalInvested}
              totalCurrentValue={totalCurrentValue}
              dividends={state.dividends}
              targetAlloc={state.targetAlloc}
              lots={state.lots}
              etfConfigs={state.etfConfigs}
              portfolioHistory={portfolioHistory}
              pricesLastUpdated={pricesLastUpdated}
            />
          </div>
          <div>
            <TargetAllocEditor
              targetAlloc={state.targetAlloc}
              enabledSymbols={enabledSymbols}
              onUpdate={updateTargetAlloc}
            />
          </div>
        </div>

        <div className="mb-6">
          <Suspense fallback={<ChartSkeleton />}>
            <PortfolioValueChart
              transactions={state.transactions}
              etfConfigs={state.etfConfigs}
            />
          </Suspense>
        </div>

        {historyDates.from && (
          <div className="mb-6">
            <Suspense fallback={<ChartSkeleton />}>
              <BenchmarkChart
                portfolioHistory={portfolioHistory}
                fromDate={historyDates.from}
                toDate={historyDates.to}
              />
            </Suspense>
          </div>
        )}

        <div className="mb-6">
          <AllocationChart
            current={currentAlloc}
            target={state.targetAlloc.alloc}
          />
        </div>

        <div className="mb-6">
          <RebalanceSuggestions
            holdings={holdings}
            targetAlloc={state.targetAlloc}
            enabledSymbols={enabledSymbols}
          />
        </div>

        <div className="mb-6">
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
            }}
          />
        </div>

        <div className="mb-6">
          <CorporateActionForm
            dividends={state.dividends}
            currentPrices={prices}
            etfConfigs={state.etfConfigs}
            onApplyCorporateAction={applyCorporateAction}
          />
        </div>

        <div className="mb-6">
          <TransactionForm
            onAdd={(tx) => {
              addTransaction(tx);
              setSuggestedTransaction(null);
            }}
            currentPrices={prices}
            lots={state.lots}
            etfConfigs={state.etfConfigs}
            initialSuggestion={suggestedTransaction}
          />
        </div>

        <TransactionList
          transactions={state.transactions}
          onDelete={deleteTransaction}
        />

        <DividendForm onAdd={addDividend} etfConfigs={state.etfConfigs} />
        <DividendList dividends={state.dividends} onDelete={deleteDividend} />

        <PriceAlertSetup
          alerts={state.priceAlerts}
          currentPrices={prices}
          etfConfigs={state.etfConfigs}
          onAdd={addPriceAlert}
          onUpdate={updatePriceAlert}
          onDelete={deletePriceAlert}
        />
      </div>
    </div>
  );
}

export default App;
