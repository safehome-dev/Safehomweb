"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CurrencySetting } from "@/lib/types/database";

export default function AdminCurrencySettingsPage() {
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();
  const [rows, setRows] = useState<CurrencySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("currency_settings")
        .select("*")
        .order("currency_code");
      setRows((data ?? []) as CurrencySetting[]);
      setLoading(false);
    })();
  }, [supabase]);

  async function save(c: CurrencySetting) {
    if (!user) return;
    setBusy(c.id);
    const rateStr = edits[c.id];
    const rate = rateStr !== undefined ? parseFloat(rateStr) : c.exchange_rate_to_ngn;
    if (!rate || rate <= 0) {
      setBusy(null);
      toast.error("Rate must be > 0.");
      return;
    }
    const { error } = await supabase
      .from("currency_settings")
      .update({
        exchange_rate_to_ngn: rate,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) =>
        prev.map((r) => (r.id === c.id ? { ...r, exchange_rate_to_ngn: rate } : r))
      );
      setEdits((e) => {
        const copy = { ...e };
        delete copy[c.id];
        return copy;
      });
      toast.success("Updated.");
    }
  }

  async function toggleActive(c: CurrencySetting) {
    setBusy(c.id);
    const next = !c.is_active;
    const { error } = await supabase
      .from("currency_settings")
      .update({ is_active: next })
      .eq("id", c.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else
      setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, is_active: next } : r)));
  }

  return (
    <AdminShell title="Currency settings">
      <Card className="p-4 text-sm text-muted-foreground">
        Rates are <strong>NGN per 1 unit of the currency</strong> (NGN itself is 1).
      </Card>
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto" />
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Card className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {c.currency_code}
                    <Badge variant="outline" className="capitalize">
                      {c.payment_provider}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{c.currency_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    inputMode="decimal"
                    value={edits[c.id] ?? String(c.exchange_rate_to_ngn ?? "")}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    className="w-32"
                  />
                  <Button
                    size="sm"
                    disabled={busy === c.id}
                    onClick={() => save(c)}
                    className="gap-1"
                  >
                    <Save className="size-4" />
                  </Button>
                </div>
                <Switch
                  checked={!!c.is_active}
                  onCheckedChange={() => toggleActive(c)}
                  disabled={busy === c.id}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
