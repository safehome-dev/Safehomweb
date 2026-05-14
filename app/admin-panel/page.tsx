"use client";

import Link from "next/link";
import {
  Banknote,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Flag,
  Home,
  Receipt,
  Settings as SettingsIcon,
  ShieldCheck,
  Star,
  Users,
  Wallet,
} from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui/card";

const TILES = [
  { href: "/admin-property-approvals", label: "Property approvals", icon: ClipboardCheck },
  { href: "/admin-properties", label: "All properties", icon: Home },
  { href: "/admin-users", label: "Users", icon: Users },
  { href: "/admin-content-reports", label: "Content reports", icon: Flag },
  { href: "/admin-reviews", label: "Reviews", icon: Star },
  { href: "/admin-subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin-transactions", label: "Transactions", icon: Receipt },
  { href: "/admin-withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin-currency-settings", label: "Currency settings", icon: Banknote },
  { href: "/admin-settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminPanelPage() {
  return (
    <AdminShell title="Admin panel" back="/profile">
      <Card className="p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
        <ShieldCheck className="size-6 text-primary" />
        <div className="text-sm">
          You have admin access. Use the tiles below to moderate the platform.
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {TILES.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="p-4 flex items-center gap-3 hover:bg-accent transition cursor-pointer">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <Icon className="size-5" />
              </div>
              <span className="flex-1 font-medium text-sm">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
