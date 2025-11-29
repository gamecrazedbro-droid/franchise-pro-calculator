export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  INR = 'INR'
}

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  name: string;
}

export interface MapSource {
  uri: string;
  title: string;
}

export interface LocationAnalysisResult {
  text: string;
  mapSources: MapSource[];
}

export interface BankerAudit {
  verdict: 'Green Light' | 'Yellow Light' | 'Red Light';
  realityCheck: string;
  stressTest: string;
  insiderIntel: string;
  recommendations: string[];
  pitch: string;
  closer: string;
}

export interface FinancialMetrics {
  totalInvestment: number;
  annualRevenue: number;
  annualExpenses: number;
  netProfit: number;
  monthlyNet: number;
  roiYears: number;
  breakEvenMonths: number;
  margin: number;
  contractTerm: number;
  requiredDailyCustomers: number;
  requiredDailyCustomersForMargin: number;
}