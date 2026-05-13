"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { convertFromCurrency, type Rates } from "@/lib/currency";
import type { CurrencySetting } from "@/lib/types/database";
import { useAuth } from "@/lib/providers/auth-provider";

interface CurrencyContextValue {
  currencies: CurrencySetting[];
  rates: Rates;
  display: string;
  setDisplay: (code: string) => void;
  convert: (price: number, source: string) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const LS_KEY = "selectedCurrency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const { user, profile } = useAuth();
  const [currencies, setCurrencies] = useState<CurrencySetting[]>([]);
  const [rates, setRates] = useState<Rates>({ NGN: 1 });
  const [display, setDisplayState] = useState<string>("NGN");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("currency_settings")
        .select("*")
        .eq("is_active", true);
      const list = (data ?? []) as CurrencySetting[];
      setCurrencies(list);
      const r: Rates = { NGN: 1 };
      list.forEach((c) => {
        r[c.currency_code] = Number(c.exchange_rate_to_ngn) || 1;
      });
      setRates(r);
    })();
  }, [supabase]);

  useEffect(() => {
    const ls = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
    if (ls) setDisplayState(ls);
    else if (profile?.preferred_currency) setDisplayState(profile.preferred_currency);
  }, [profile?.preferred_currency]);

  const setDisplay = useCallback(
    (code: string) => {
      setDisplayState(code);
      if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, code);
      if (user) {
        supabase
          .from("profiles")
          .update({ preferred_currency: code })
          .eq("id", user.id)
          .then();
      }
    },
    [user, supabase]
  );

  const convert = useCallback(
    (price: number, source: string) =>
      convertFromCurrency(price, source || "NGN", display, rates),
    [display, rates]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currencies, rates, display, setDisplay, convert }),
    [currencies, rates, display, setDisplay, convert]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
