"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Banknote,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  HeartHandshake,
  LogOut,
  Mail,
  MessageCircle,
  PencilLine,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Trash2,
  Users,
  UserPlus,
  Wrench,
} from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/lib/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarFallback } from "@/lib/fallback-image";
import { toast } from "sonner";

type Row = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const SUPPORT_EMAIL = "support@safehome.com";

export default function ProfilePage() {
  const { user, profile, loading, signOut, deleteAccount } = useAuth();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </SiteShell>
    );
  }

  const isLister =
    profile?.user_type === "lister" || profile?.user_type === "both";
  const isAdmin = profile?.role === "admin";

  const socialRows: Row[] = [
    { href: "/friends", label: "Friends", icon: Users },
    { href: "/find-friends", label: "Find friends", icon: UserPlus },
    { href: "/friend-requests", label: "Friend requests", icon: Mail },
    {
      href: "/create-roommate-profile",
      label: "Create roommate profile",
      icon: HeartHandshake,
    },
    { href: "/roommate-matches", label: "Roommate matches", icon: Heart },
  ];

  const serviceRows: Row[] = [
    { href: "/services", label: "Browse services", icon: Wrench },
    {
      href: "/create-service-provider",
      label: "Become a service provider",
      icon: Briefcase,
    },
    {
      href: "/my-service-bookings",
      label: "My service bookings",
      icon: Calendar,
    },
    {
      href: "/service-bookings",
      label: "Service requests",
      icon: ClipboardList,
    },
  ];

  const settingsRows: Row[] = [
    { href: "/profile/edit", label: "Account management", icon: PencilLine },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
  ];
  if (isAdmin) {
    settingsRows.push(
      { href: "/admin-panel", label: "Admin panel", icon: ShieldCheck },
      {
        href: "/admin-currency-settings",
        label: "Currency settings",
        icon: Banknote,
      }
    );
  }

  const billingRows: Row[] = [
    {
      href: "/listing-payment",
      label: "View subscription plans",
      icon: CreditCard,
    },
    { href: "/subscription", label: "Subscription & transactions", icon: Receipt },
  ];
  if (isLister) {
    billingRows.push(
      {
        href: "/lister-bookings",
        label: "Property bookings",
        icon: Calendar,
      },
      {
        href: "/lister-earnings",
        label: "Earnings & withdrawals",
        icon: PiggyBank,
      }
    );
  }

  const helpRows: Row[] = [
    { href: "/terms-of-service", label: "Terms & conditions", icon: FileText },
    { href: "/privacy-policy", label: "Privacy policy", icon: ShieldCheck },
    {
      href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("SafeHome Support Request")}`,
      label: "Contact support",
      icon: MessageCircle,
    },
  ];

  async function onConfirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Account deleted.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete account.";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Header card */}
        <Card className="p-5 flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback>
              <img src={avatarFallback(profile?.name ?? user.email)} alt="" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg line-clamp-1">
              {profile?.name ?? "Add your name"}
            </div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {user.email}
            </div>
            {profile?.city && (
              <div className="text-xs text-muted-foreground mt-0.5">
                📍 {profile.city}
              </div>
            )}
            {profile?.bio && (
              <p className="text-sm mt-2 line-clamp-2">{profile.bio}</p>
            )}
          </div>
          <Link href="/profile/edit">
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
        </Card>

        <Section title="Social & Community" rows={socialRows} />
        <Section title="Services" rows={serviceRows} />
        <Section title="Settings" rows={settingsRows} />
        <Section title="Subscription & Billing" rows={billingRows} />
        <Section title="Help & Support" rows={helpRows} />

        <Button
          variant="outline"
          className="w-full gap-2 bg-destructive/5 hover:bg-destructive/10 border-destructive/30 text-destructive"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="size-4" /> Logout
        </Button>

        <Button
          variant="ghost"
          className="w-full gap-2 text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" /> Delete account
        </Button>
      </div>

      {/* Logout confirm */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logout?</DialogTitle>
            <DialogDescription>
              You can sign back in anytime with your email or Google account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setLogoutOpen(false);
                signOut();
              }}
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto size-12 rounded-full bg-destructive/10 grid place-items-center mb-2">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all associated data —
              properties, bookings, messages, reviews and earnings. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={onConfirmDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground/80 px-1">{title}</h2>
      <Card className="p-0 overflow-hidden">
        <ul className="divide-y">
          {rows.map(({ href, label, icon: Icon }) => {
            const external = href.startsWith("mailto:") || href.startsWith("http");
            const inner = (
              <span className="flex items-center gap-3 p-4 hover:bg-accent transition cursor-pointer">
                <Icon className="size-5 text-primary" />
                <span className="flex-1 text-sm font-medium">{label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </span>
            );
            return (
              <li key={`${title}-${label}`}>
                {external ? (
                  <a href={href}>{inner}</a>
                ) : (
                  <Link href={href}>{inner}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
