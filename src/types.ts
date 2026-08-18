export type TransactionType = "BUY" | "SELL";

export const DEFAULT_ETF_SYMBOLS = ["VAS", "VGS", "VGE", "VISM", "NDQ"];

export type EtfSymbol = string;

export type DisposalMethod = "FIFO" | "HIFO" | "SPECIFIC";

export interface EtfConfig {
  symbol: string;
  yahooSymbol: string;
  name: string;
  enabled: boolean;
}

export interface Lot {
  id: string;
  symbol: EtfSymbol;
  units: number;
  costBasisPerUnit: number;
  purchaseDate: string;
  notes?: string;
  originalTransactionId?: string;
  linkedDividendId?: string;
}

export interface Transaction {
  id: string;
  date: string;
  etf: EtfSymbol;
  type: TransactionType;
  units: number;
  pricePerUnit: number;
  realizedGain?: number;
  lotId?: string | null;
  lotIds?: string[];
  disposalMethod?: DisposalMethod;
  realizedShortTermGain?: number;
  realizedLongTermGain?: number;
}

export interface Dividend {
  id: string;
  etf: EtfSymbol;
  exDate: string;
  payDate: string;
  amountPerUnit: number;
  unitsHeldAtExDate: number;
  frankingCredits?: number;
}

export interface PriceAlert {
  id: string;
  etf: EtfSymbol;
  targetPrice: number;
  above: boolean; // true = alert when price goes above, false = below
  triggered: boolean;
}

export interface Holding {
  etf: EtfSymbol;
  totalUnits: number;
  totalCost: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGainLoss: number;
  realizedGainLossTotal: number;
  realizedShortTermGainLoss: number;
  realizedLongTermGainLoss: number;
}

export interface TargetAlloc {
  alloc: Record<string, number>;
  holdingPeriodDays?: number;
  driftTolerancePercent?: number;
}

export interface ReminderSchedule {
  id: string;
  enabled: boolean;
  amount: number;
  intervalDays: number;
  nextTriggerAt: string;
  lastTriggeredAt?: string;
}

export interface State {
  transactions: Transaction[];
  lots: Lot[];
  targetAlloc: TargetAlloc;
  dividends: Dividend[];
  priceAlerts: PriceAlert[];
  reminderSchedules: ReminderSchedule[];
  etfConfigs: EtfConfig[];
  fortnightlyTargetAlloc?: Record<string, number>;
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  lastUpdated: string;
}
