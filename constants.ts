import { CurrencyCode, CurrencyConfig } from './types';

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  [CurrencyCode.USD]: { code: CurrencyCode.USD, symbol: '$', locale: 'en-US', name: 'US Dollar' },
  [CurrencyCode.EUR]: { code: CurrencyCode.EUR, symbol: '€', locale: 'de-DE', name: 'Euro' },
  [CurrencyCode.INR]: { code: CurrencyCode.INR, symbol: '₹', locale: 'en-IN', name: 'Indian Rupee' },
};

export const DEFAULT_CURRENCY = CurrencyCode.INR;