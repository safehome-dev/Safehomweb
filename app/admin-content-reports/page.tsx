"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ContentReport } from "@/lib/types/database";

const STATUSES = ["pending", "reviewed", "dismissed"] as const;
type Status = (typeof STATUSES)[number];

export default function AdminContentReportsPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("content_reports")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as ContentReport[]);
      setLoading(false);
    })();
  }, [status, supabase]);

  async function setStatusFor(id: string, next: "reviewed" | "dismissed", action: string) {
    if (!user) return;
    setBusy(id);
    const { error } = await supabase
      .from("content_reports")
      .update({
        status: next,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        action_taken: action,
      })
      .eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Marked ${next}.`);
    }
  }

  return (
    <AdminShell title="Content reports">
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
              <Card className="p-10 text-center space-y-2">
                <Flag className="size-12 mx-auto text-muted-foreground" />
                <div className="text-sm text-muted-foreground">No reports.</div>
              </Card>
            ) : (
              rows.map((r) => (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{r.reason}</div>
                    <Badge variant="outline" className="capitalize">
                      {r.target_type}
                    </Badge>
                  </div>
                  {r.details && <p className="text-sm">{r.details}</p>}
                  <div className="text-xs text-muted-foreground">
                    Reported {format(new Date(r.created_at), "PPP p")} ·{" "}
                    {r.auto_blocked ? "Auto-blocked" : "Manual review"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reporter: {r.reporter_id} · Reported user: {r.reported_user_id}
                  </div>
                  {status === "pending" && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        disabled={busy === r.id}
                        onClick={() => setStatusFor(r.id, "reviewed", "action_taken")}
                        className="gap-1"
                      >
                        <Check className="size-4" /> Mark reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === r.id}
                        onClick={() => setStatusFor(r.id, "dismissed", "no_action")}
                        className="gap-1"
                      >
                        <X className="size-4" /> Dismiss
                      </Button>
                    </div>
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
