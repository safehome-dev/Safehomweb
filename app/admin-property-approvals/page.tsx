"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, ClipboardCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";
import { propertyHref } from "@/lib/slug";
import type { Property } from "@/lib/types/database";

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

export default function AdminPropertyApprovalsPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [status, setStatus] = useState<Status>("pending");
  const [rows, setRows] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("approval_status", status)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Property[]);
      setLoading(false);
    })();
  }, [status, supabase]);

  async function setApproval(id: string, next: "approved" | "rejected") {
    if (!user) return;
    setBusyId(id);
    const patch: Record<string, unknown> = {
      approval_status: next,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("properties").update(patch).eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Marked ${next}.`);
    }
  }

  return (
    <AdminShell title="Property approvals">
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
                <ClipboardCheck className="size-12 mx-auto text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Nothing here.</div>
              </Card>
            ) : (
              rows.map((p) => {
                const hero = (p.images as string[])?.[0];
                return (
                  <Card key={p.id} className="p-3 flex gap-3">
                    {hero && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hero}
                        alt=""
                        className="size-20 rounded-md object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <Link
                        href={propertyHref(p)}
                        className="font-medium line-clamp-1 hover:underline"
                      >
                        {p.title}
                      </Link>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {p.location_city}, {p.location_country} ·{" "}
                        {formatPrice(Number(p.price), p.currency ?? "GBP")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Listed {p.created_at ? format(new Date(p.created_at), "PP") : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === p.id}
                            onClick={() => setApproval(p.id, "approved")}
                            className="gap-1"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === p.id}
                            onClick={() => setApproval(p.id, "rejected")}
                            className="gap-1"
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      )}
                      {status !== "pending" && (
                        <Badge variant="outline" className="capitalize">
                          {p.approval_status ?? status}
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AdminShell>
  );
}
