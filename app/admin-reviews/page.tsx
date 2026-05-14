"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Review } from "@/lib/types/database";

export default function AdminReviewsPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Review[]);
      setLoading(false);
    })();
  }, [supabase]);

  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted.");
    }
  }

  return (
    <AdminShell title="Reviews">
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No reviews.</Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="p-3 flex items-start gap-3">
                <div className="flex items-center gap-1 text-amber-500 shrink-0">
                  <Star className="size-4 fill-amber-500" />
                  <span className="font-medium">{r.rating}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <Badge variant="outline" className="capitalize">
                    {r.review_type}
                  </Badge>
                  {r.comment && <p className="text-sm">{r.comment}</p>}
                  <div className="text-xs text-muted-foreground">
                    {r.created_at ? format(new Date(r.created_at), "PPP p") : ""}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
