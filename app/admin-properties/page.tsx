"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/currency";
import { propertyHref } from "@/lib/slug";
import type { Property } from "@/lib/types/database";

export default function AdminPropertiesPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Property[]);
      setLoading(false);
    })();
  }, [supabase]);

  async function setAvailability(id: string, next: boolean) {
    const { error } = await supabase
      .from("properties")
      .update({ is_available: next })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.map((p) => (p.id === id ? { ...p, is_available: next } : p)));
      toast.success(next ? "Listed" : "Unlisted");
    }
  }

  const filtered = q
    ? rows.filter((r) =>
        `${r.title} ${r.location_city} ${r.location_country}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : rows;

  return (
    <AdminShell title="All properties">
      <Input
        placeholder="Search by title, city or country"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No properties found.</Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <Card className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={propertyHref(p)}
                    className="font-medium line-clamp-1 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {p.location_city}, {p.location_country} ·{" "}
                    {formatPrice(Number(p.price), p.currency ?? "GBP")} ·{" "}
                    {p.created_at ? format(new Date(p.created_at), "PP") : ""}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {p.approval_status ?? "—"}
                </Badge>
                <Button
                  size="sm"
                  variant={p.is_available ? "outline" : "default"}
                  onClick={() => setAvailability(p.id, !p.is_available)}
                >
                  {p.is_available ? "Unlist" : "List"}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
