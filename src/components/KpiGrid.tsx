import { Badge } from "./ui/Badge";
import { KpiTile } from "./ui/KpiTile";
import { StatTile } from "./ui/StatTile";
import { PortfolioMetrics } from "../utils/portfolioMetrics";
import { ReturnPeriod } from "../utils/returns";
import { money } from "../utils/money";

interface Props {
  metrics: PortfolioMetrics;
  period: ReturnPeriod;
}

const HERO_INFO: Record<string, string> = {
  invested:
    "Total capital you have paid to build your current holdings, including brokerage.",
  value: "Today's market value of all your holdings at the latest prices.",
  unrealized:
    "Paper profit or loss on shares you still own, measured against what you paid.",
  twr: "Time-Weighted Return: growth rate ignoring the size and timing of your deposits. Best for comparing against a benchmark.",
  mwr: "Money-Weighted Return (IRR): your personal return including the effect of when you added money.",
  cagr: "Compound annual growth rate since your first transaction.",
};

const STAT_INFO: Record<string, string> = {
  realized: "Locked-in profit or loss from shares you have sold.",
  shortTerm:
    "Realized gains on lots held for 12 months or less (taxed at your marginal rate).",
  longTerm:
    "Realized gains on lots held for more than 12 months (CGT discount eligible).",
  dividends: "Cash dividends paid to you across all holdings.",
  totalReturn:
    "Price change plus dividends received, as a percentage of invested capital.",
};

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function pctRaw(value: number): string {
  return `${value.toFixed(2)}%`;
}

function trendOf(value: number): "gain" | "loss" | "neutral" {
  if (value > 0) return "gain";
  if (value < 0) return "loss";
  return "neutral";
}

export function KpiGrid({ metrics, period }: Props) {
  const periodBadge = <Badge tone="info">{period}</Badge>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Total Invested"
          value={money(metrics.totalInvested)}
          info={HERO_INFO.invested}
        />
        <KpiTile
          label="Current Value"
          value={money(metrics.totalCurrentValue)}
          info={HERO_INFO.value}
        />
        <KpiTile
          label="Unrealized P&L"
          value={money(metrics.unrealizedGainLoss)}
          trend={trendOf(metrics.unrealizedGainLoss)}
          info={HERO_INFO.unrealized}
        />
        <KpiTile
          label="TWR"
          value={pct(metrics.timeWeightedReturn)}
          trend={trendOf(metrics.timeWeightedReturn)}
          badge={periodBadge}
          info={HERO_INFO.twr}
        />
        <KpiTile
          label="MWR"
          value={pct(metrics.moneyWeightedReturn)}
          trend={trendOf(metrics.moneyWeightedReturn)}
          badge={periodBadge}
          info={HERO_INFO.mwr}
        />
        <KpiTile
          label="CAGR"
          value={pct(metrics.cagr)}
          trend={trendOf(metrics.cagr)}
          badge={periodBadge}
          info={HERO_INFO.cagr}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile
          label="Realized P&L"
          value={money(metrics.realizedGainLoss)}
          trend={trendOf(metrics.realizedGainLoss)}
          info={STAT_INFO.realized}
        />
        <StatTile
          label="Short-term Realized"
          value={money(metrics.shortTermRealizedGainLoss)}
          trend={trendOf(metrics.shortTermRealizedGainLoss)}
          info={STAT_INFO.shortTerm}
        />
        <StatTile
          label="Long-term Realized"
          value={money(metrics.longTermRealizedGainLoss)}
          trend={trendOf(metrics.longTermRealizedGainLoss)}
          info={STAT_INFO.longTerm}
        />
        <StatTile
          label="Dividends Received"
          value={money(metrics.totalDividends)}
          info={STAT_INFO.dividends}
        />
        <StatTile
          label="Total Return"
          value={pctRaw(metrics.totalReturnPct)}
          trend={trendOf(metrics.totalReturnPct)}
          info={STAT_INFO.totalReturn}
        />
      </div>
    </div>
  );
}
