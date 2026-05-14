"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";
import type { Subscription } from "@/lib/types/database";

const STATUSES = ["active", "expired", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

export default function AdminSubscriptionsPage() {
  const supabase = getSupabaseBrowserClient();
  const [status, setStatus] = useState<Status>("active");
  const [rows, setRows] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Subscription[]);
      setLoading(false);
    })();
  }, [status, supabase]);

  const filtered = q
    ? rows.filter((r) => `${r.plan_type} ${r.user_id}`.toLowerCase().includes(q.toLowerCase()))
    : rows;

  return (
    <AdminShell title="Subscriptions">
      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabsList>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Input
        placeholder="Search by plan or user id"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto" />
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <Card className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium capitalize">{s.plan_type}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    User {s.user_id} · started{" "}
                    {s.starts_at ? format(new Date(s.starts_at), "PP") : "—"}
                    {s.expires_at ? ` · expires ${format(new Date(s.expires_at), "PP")}` : ""}
                  </div>
                </div>
                {s.price && (
                  <span className="text-sm font-medium">
                    {formatPrice(Number(s.price), s.currency ?? "GBP")}
                  </span>
                )}
                <Badge variant="outline" className="capitalize">{s.status}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
