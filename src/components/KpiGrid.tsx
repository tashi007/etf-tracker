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
        <KpiTile label="Total Invested" value={money(metrics.totalInvested)} />
        <KpiTile
          label="Current Value"
          value={money(metrics.totalCurrentValue)}
        />
        <KpiTile
          label="Unrealized P&L"
          value={money(metrics.unrealizedGainLoss)}
          trend={trendOf(metrics.unrealizedGainLoss)}
        />
        <KpiTile
          label="TWR"
          value={pct(metrics.timeWeightedReturn)}
          trend={trendOf(metrics.timeWeightedReturn)}
          badge={periodBadge}
        />
        <KpiTile
          label="MWR"
          value={pct(metrics.moneyWeightedReturn)}
          trend={trendOf(metrics.moneyWeightedReturn)}
          badge={periodBadge}
        />
        <KpiTile
          label="CAGR"
          value={pct(metrics.cagr)}
          trend={trendOf(metrics.cagr)}
          badge={periodBadge}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile
          label="Realized P&L"
          value={money(metrics.realizedGainLoss)}
          trend={trendOf(metrics.realizedGainLoss)}
        />
        <StatTile
          label="Short-term Realized"
          value={money(metrics.shortTermRealizedGainLoss)}
          trend={trendOf(metrics.shortTermRealizedGainLoss)}
        />
        <StatTile
          label="Long-term Realized"
          value={money(metrics.longTermRealizedGainLoss)}
          trend={trendOf(metrics.longTermRealizedGainLoss)}
        />
        <StatTile
          label="Dividends Received"
          value={money(metrics.totalDividends)}
        />
        <StatTile
          label="Total Return"
          value={pctRaw(metrics.totalReturnPct)}
          trend={trendOf(metrics.totalReturnPct)}
        />
      </div>
    </div>
  );
}
