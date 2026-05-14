"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import type { Profile } from "@/lib/types/database";

export default function AdminUsersPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      setRows((data ?? []) as Profile[]);
      setLoading(false);
    })();
  }, [supabase]);

  async function toggleSuspend(p: Profile) {
    setBusy(p.id);
    const next = !p.is_suspended;
    const { error } = await supabase
      .from("profiles")
      .update({
        is_suspended: next,
        suspended_at: next ? new Date().toISOString() : null,
        suspension_reason: next ? "Suspended by admin" : null,
      })
      .eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) =>
        prev.map((r) => (r.id === p.id ? { ...r, is_suspended: next } : r))
      );
      toast.success(next ? "User suspended" : "User unsuspended");
    }
  }

  async function toggleAdmin(p: Profile) {
    setBusy(p.id);
    const next = p.role === "admin" ? "user" : "admin";
    const { error } = await supabase.from("profiles").update({ role: next }).eq("id", p.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) =>
        prev.map((r) => (r.id === p.id ? { ...r, role: next as Profile["role"] } : r))
      );
      toast.success(`Role set to ${next}.`);
    }
  }

  const filtered = q
    ? rows.filter((r) =>
        `${r.name ?? ""} ${r.city ?? ""} ${r.phone ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : rows;

  return (
    <AdminShell title="Users">
      <Input
        placeholder="Search by name, city or phone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto" />
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <Card className="p-3 flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <img src={avatarFallback(p.name)} alt="" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium line-clamp-1">
                      {p.name ?? "Unnamed"}
                    </span>
                    {p.role === "admin" && (
                      <Badge variant="default" className="gap-1">
                        <ShieldCheck className="size-3" /> Admin
                      </Badge>
                    )}
                    {p.is_suspended && (
                      <Badge variant="destructive" className="gap-1">
                        <ShieldAlert className="size-3" /> Suspended
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {p.user_type ?? "—"} · {p.city ?? ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === p.id}
                  onClick={() => toggleAdmin(p)}
                >
                  {p.role === "admin" ? "Demote" : "Promote"}
                </Button>
                <Button
                  size="sm"
                  variant={p.is_suspended ? "default" : "destructive"}
                  disabled={busy === p.id}
                  onClick={() => toggleSuspend(p)}
                >
                  {p.is_suspended ? "Unsuspend" : "Suspend"}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
