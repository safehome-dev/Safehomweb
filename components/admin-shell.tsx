"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Loader2, ShieldOff } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/providers/auth-provider";

export function AdminShell({
  title,
  back = "/admin-panel",
  children,
}: {
  title: string;
  back?: string;
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent("/admin-panel")}`);
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      </SiteShell>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-10 max-w-md">
          <Card className="p-6 text-center space-y-3">
            <div className="mx-auto size-14 rounded-full bg-destructive/10 grid place-items-center">
              <ShieldOff className="size-6 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Admins only</h1>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to view this page.
            </p>
            <Link href="/"><Button variant="outline">Back home</Button></Link>
          </Card>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        <div className="flex items-center gap-2">
          <Link href={back}>
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex-1">{title}</h1>
        </div>
        {children}
      </div>
    </SiteShell>
  );
}
