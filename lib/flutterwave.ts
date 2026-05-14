// Minimal browser-side typings for the FlutterwaveCheckout v3 inline SDK.
// Loaded from https://checkout.flutterwave.com/v3.js — exposes `window.FlutterwaveCheckout`.

export interface FlutterwaveCustomer {
  email: string;
  name?: string;
  phone_number?: string;
}

export interface FlutterwaveCustomizations {
  title?: string;
  description?: string;
  logo?: string;
}

export interface FlutterwaveCallbackData {
  status: "successful" | "completed" | "failed" | "cancelled" | string;
  transaction_id: number | string;
  tx_ref: string;
  flw_ref?: string;
  amount?: number;
  currency?: string;
}

export interface FlutterwaveCheckoutConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options?: string;
  customer: FlutterwaveCustomer;
  customizations?: FlutterwaveCustomizations;
  meta?: Record<string, unknown>;
  callback: (data: FlutterwaveCallbackData) => void;
  onclose: () => void;
}

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: FlutterwaveCheckoutConfig) => void;
  }
}

export const FLUTTERWAVE_INLINE_SRC = "https://checkout.flutterwave.com/v3.js";
