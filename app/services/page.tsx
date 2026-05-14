"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCard } from "@/components/service-card";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, ServiceProvider } from "@/lib/types/database";

const SERVICE_CATEGORIES = [
  "hairdressing",
  "barbing",
  "tailoring",
  "plumbing",
  "electrical",
  "cleaning",
  "painting",
  "carpentry",
  "catering",
  "laundry",
] as const;

type Provider = ServiceProvider & {
  profile: Pick<Profile, "name" | "avatar_url"> | null;
};

export default function ServicesPage() {
  const supabase = getSupabaseBrowserClient();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("service_providers")
        .select("*")
        .eq("is_active", true)
        .order("average_rating", { ascending: false, nullsFirst: false });
      const rows = (data ?? []) as ServiceProvider[];
      const userIds = rows.map((r) => r.user_id);
      const profileMap = new Map<string, Pick<Profile, "name" | "avatar_url">>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", userIds);
        ((profiles ?? []) as Profile[]).forEach((p) =>
          profileMap.set(p.id, { name: p.name, avatar_url: p.avatar_url })
        );
      }
      setProviders(
        rows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null }))
      );
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return providers.filter((p) => {
      if (category && !(p.service_categories ?? []).includes(category)) return false;
      if (!term) return true;
      return (
        p.business_name.toLowerCase().includes(term) ||
        (p.profile?.name ?? "").toLowerCase().includes(term) ||
        p.city.toLowerCase().includes(term) ||
        (p.service_categories ?? []).some((c) => c.toLowerCase().includes(term))
      );
    });
  }, [providers, search, category]);

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Services</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services, location or business"
              className="pl-9 h-11 bg-card"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize cursor-pointer border ${
                category === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-accent"
              }`}
            >
              All
            </button>
            {SERVICE_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-sm capitalize cursor-pointer border ${
                  category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/12]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-muted-foreground">
              {search || category
                ? "No service providers match."
                : "No service providers yet."}
            </p>
            <Link href="/create-service-provider">
              <Button>Become a service provider</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ServiceCard key={p.id} provider={p} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
