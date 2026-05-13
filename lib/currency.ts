export const CURRENCY_FLAGS: Record<string, string> = {
  NGN: "🇳🇬",
  GBP: "🇬🇧",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  CAD: "🇨🇦",
  GHS: "🇬🇭",
  KES: "🇰🇪",
  ZAR: "🇿🇦",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  GBP: "£",
  USD: "$",
  EUR: "€",
  CAD: "C$",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R",
};

export type Rates = Record<string, number>;

// rates[code] = how many NGN equal 1 unit of `code` (NGN itself is 1).
export function convertFromCurrency(
  price: number,
  sourceCurrency: string,
  targetCurrency: string,
  rates: Rates
): number {
  if (!price || sourceCurrency === targetCurrency) return price;
  const src = rates[sourceCurrency] ?? (sourceCurrency === "NGN" ? 1 : 1);
  const tgt = rates[targetCurrency] ?? (targetCurrency === "NGN" ? 1 : 1);
  if (!src || !tgt) return price;
  return (price * src) / tgt;
}

export function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const rounded = Math.round(price);
  return `${symbol}${rounded.toLocaleString()}`;
}
