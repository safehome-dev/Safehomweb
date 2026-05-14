"use client";

import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Settings">
      <Card className="p-6 space-y-3 text-sm">
        <p>
          Platform-level toggles are managed through the Supabase project
          dashboard. Use the links below to manage common configuration:
        </p>
        <ul className="space-y-2">
          <li>
            <Link href="/admin-currency-settings">
              <Button variant="outline" className="w-full justify-start">
                Currency exchange rates
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/admin-users">
              <Button variant="outline" className="w-full justify-start">
                Admin / suspension controls (Users)
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/admin-content-reports">
              <Button variant="outline" className="w-full justify-start">
                Content moderation queue
              </Button>
            </Link>
          </li>
        </ul>
      </Card>
    </AdminShell>
  );
}
