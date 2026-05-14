"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";

interface Tx {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  created_at: string | null;
}

export default function AdminTransactionsPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("transactions")
        .select("id, user_id, amount, currency, payment_method, payment_reference, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      setRows((data ?? []) as unknown as Tx[]);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = q
    ? rows.filter((t) =>
        `${t.payment_reference ?? ""} ${t.user_id} ${t.payment_status ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : rows;

  return (
    <AdminShell title="Transactions">
      <Input
        placeholder="Search by reference, user id or status"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto" />
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li key={t.id}>
              <Card className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {formatPrice(Number(t.amount), t.currency)}{" "}
                    <span className="text-muted-foreground font-normal text-sm">
                      via {t.payment_method ?? "—"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {t.payment_reference ?? "—"} ·{" "}
                    {t.created_at ? format(new Date(t.created_at), "PP p") : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">User {t.user_id}</div>
                </div>
                <Badge variant="outline" className="capitalize">{t.payment_status ?? "—"}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
