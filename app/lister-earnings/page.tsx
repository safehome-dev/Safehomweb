"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Banknote, Coins, Loader2, PiggyBank } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";

interface Earning {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
}

interface WithdrawalRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Method {
  id: string;
  bank_name: string | null;
  account_number: string | null;
  is_default: boolean;
}

export default function ListerEarningsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"GBP" | "NGN" | "USD">("GBP");
  const [methodId, setMethodId] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/lister-earnings")}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [e, w, m] = await Promise.all([
      supabase
        .from("earnings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawal_methods")
        .select("id, bank_name, account_number, is_default")
        .eq("user_id", user.id),
    ]);
    setEarnings((e.data ?? []) as Earning[]);
    setWithdrawals((w.data ?? []) as WithdrawalRow[]);
    setMethods((m.data ?? []) as Method[]);
    const def = ((m.data ?? []) as Method[]).find((x) => x.is_default) ?? (m.data ?? [])[0] as Method | undefined;
    if (def) setMethodId(def.id);
    setLoading(false);
  }

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, { available: number; pending: number; withdrawn: number }> = {};
    for (const e of earnings) {
      const cur = e.currency;
      if (!totals[cur]) totals[cur] = { available: 0, pending: 0, withdrawn: 0 };
      const amt = Number(e.amount) || 0;
      if (e.status === "available") totals[cur].available += amt;
      else if (e.status === "pending") totals[cur].pending += amt;
      else if (e.status === "withdrawn") totals[cur].withdrawn += amt;
    }
    return totals;
  }, [earnings]);

  async function requestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount.");
    if (!methodId) return toast.error("Choose a withdrawal method.");
    setSubmitting(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: user.id,
      withdrawal_method_id: methodId,
      amount: amt,
      currency,
      status: "pending",
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Withdrawal request submitted.");
      setOpen(false);
      setAmount("");
      await load();
    }
  }

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Earnings & withdrawals</h1>
          <Link href="/withdrawal-methods">
            <Button size="sm" variant="outline" className="gap-1">
              <Banknote className="size-4" /> Methods
            </Button>
          </Link>
        </div>

        {Object.keys(totalsByCurrency).length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <PiggyBank className="size-12 mx-auto text-muted-foreground" />
            <div className="font-medium">No earnings yet</div>
            <p className="text-sm text-muted-foreground">
              Once your properties get booked, your earnings will appear here.
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(totalsByCurrency).map(([cur, t]) => (
              <Card key={cur} className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coins className="size-4" />
                  <span className="text-sm font-medium">{cur}</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(t.available, cur)}
                </div>
                <div className="text-xs text-muted-foreground space-x-2">
                  <span>Pending: {formatPrice(t.pending, cur)}</span>
                  <span>·</span>
                  <span>Withdrawn: {formatPrice(t.withdrawn, cur)}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setCurrency(cur as "GBP" | "NGN" | "USD");
                    setAmount(t.available.toFixed(2));
                    setOpen(true);
                  }}
                  disabled={t.available <= 0 || methods.length === 0}
                >
                  Withdraw
                </Button>
              </Card>
            ))}
          </div>
        )}

        <section className="space-y-2">
          <h2 className="font-semibold">Recent earnings</h2>
          {earnings.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground text-center">
              No earnings recorded yet.
            </Card>
          ) : (
            <ul className="space-y-2">
              {earnings.slice(0, 10).map((e) => (
                <li key={e.id}>
                  <Card className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium capitalize">{e.type}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {e.description ?? format(new Date(e.created_at), "PP")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatPrice(Number(e.amount), e.currency)}
                      </div>
                      <Badge variant="outline" className="capitalize">{e.status}</Badge>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Withdrawal requests</h2>
          {withdrawals.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground text-center">
              No withdrawal requests yet.
            </Card>
          ) : (
            <ul className="space-y-2">
              {withdrawals.map((w) => (
                <li key={w.id}>
                  <Card className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {formatPrice(Number(w.amount), w.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(w.created_at), "PP")}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{w.status}</Badge>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {methods.length === 0 && (
          <Card className="p-4 border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-center justify-between">
            <span>Add a bank account to enable withdrawals.</span>
            <Link href="/withdrawal-methods">
              <Button size="sm">Add</Button>
            </Link>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request withdrawal</DialogTitle>
          </DialogHeader>
          <form onSubmit={requestWithdrawal} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "GBP" | "NGN" | "USD")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Withdraw to</Label>
              <Select value={methodId} onValueChange={setMethodId}>
                <SelectTrigger><SelectValue placeholder="Choose bank" /></SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.bank_name} ····{(m.account_number ?? "").slice(-4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}
