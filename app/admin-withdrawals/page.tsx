"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";

interface Row {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  rejection_reason: string | null;
  transaction_reference: string | null;
  created_at: string;
}

const STATUSES = ["pending", "approved", "processing", "completed", "rejected"] as const;
type Status = (typeof STATUSES)[number];

export default function AdminWithdrawalsPage() {
  const supabase = getSupabaseBrowserClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [status, supabase]);

  async function update(id: string, next: Status, reason?: string) {
    if (!user) return;
    setBusy(id);
    const patch: Record<string, unknown> = {
      status: next,
      approved_by: next === "approved" || next === "processing" ? user.id : undefined,
      approved_at: next === "approved" ? new Date().toISOString() : undefined,
      completed_at: next === "completed" ? new Date().toISOString() : undefined,
      rejection_reason: next === "rejected" ? reason ?? null : undefined,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("withdrawal_requests").update(patch).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Marked ${next}.`);
    }
  }

  return (
    <AdminShell title="Withdrawals">
      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabsList>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
        {STATUSES.map((s) => (
          <TabsContent key={s} value={s} className="mt-4 space-y-3">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mx-auto" />
              </div>
            ) : rows.length === 0 ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                No withdrawals.
              </Card>
            ) : (
              rows.map((r) => (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">
                      {formatPrice(Number(r.amount), r.currency)}
                    </div>
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    User {r.user_id} · {format(new Date(r.created_at), "PPP p")}
                  </div>
                  {r.rejection_reason && (
                    <p className="text-sm text-destructive">Reason: {r.rejection_reason}</p>
                  )}
                  {status === "pending" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={busy === r.id}
                        onClick={() => update(r.id, "approved")}
                        className="gap-1"
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => {
                          const reason = prompt("Rejection reason?") ?? undefined;
                          void update(r.id, "rejected", reason);
                        }}
                        className="gap-1"
                      >
                        <X className="size-4" /> Reject
                      </Button>
                    </div>
                  )}
                  {status === "approved" && (
                    <Button
                      size="sm"
                      disabled={busy === r.id}
                      onClick={() => update(r.id, "completed")}
                    >
                      Mark completed
                    </Button>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AdminShell>
  );
}
