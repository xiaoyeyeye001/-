export type Period = 'week' | 'month' | 'year';

export interface DailyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  gmv: number; // Gross Merchandise Value
  cogs: number; // Cost of Goods Sold
  ads: number; // Advertising Spend
  shipping: number; // Logistics
  platformFees: number; // Commission/Fees
  otherCosts: number; // Misc
  refundsOnly: number; // Amount refunded (no return)
  returns: number; // Amount returned & refunded
}

export interface FinancialSummary {
  totalGmv: number;
  netSales: number; // GMV - Refunds
  totalCost: number;
  netProfit: number;
  grossMarginPercent: number;
  roi: number; // Return on Investment
  costBreakdown: {
    cogs: number;
    ads: number;
    shipping: number;
    fees: number;
    others: number;
  };
}

export interface GoalSettings {
  weekly: number;
  monthly: number;
  yearly: number;
}
