"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Banknote, Check, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/location-data";

interface Method {
  id: string;
  method_type: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  country: string;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
}

export default function WithdrawalMethodsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [country, setCountry] = useState<string>("UK");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/withdrawal-methods")}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("withdrawal_methods")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setMethods((data ?? []) as Method[]);
    setLoading(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error("All bank fields are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("withdrawal_methods").insert({
      user_id: user.id,
      method_type: "bank_account",
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      account_name: accountName.trim(),
      country,
      is_default: methods.length === 0,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    await load();
    toast.success("Withdrawal method added.");
  }

  async function setDefault(id: string) {
    if (!user) return;
    await supabase
      .from("withdrawal_methods")
      .update({ is_default: false })
      .eq("user_id", user.id);
    const { error } = await supabase
      .from("withdrawal_methods")
      .update({ is_default: true })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Default updated.");
      await load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this withdrawal method?")) return;
    const { error } = await supabase.from("withdrawal_methods").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed.");
      await load();
    }
  }

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Withdrawal methods</h1>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
            <Plus className="size-4" /> Add
          </Button>
        </div>

        {methods.length === 0 ? (
          <Card className="p-10 text-center space-y-3">
            <Banknote className="size-12 mx-auto text-muted-foreground" />
            <div className="font-medium">No withdrawal methods yet</div>
            <p className="text-sm text-muted-foreground">
              Add a bank account so we know where to send your earnings.
            </p>
            <Button onClick={() => setOpen(true)} className="gap-1">
              <Plus className="size-4" /> Add bank account
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {methods.map((m) => (
              <li key={m.id}>
                <Card className="p-4 flex items-start gap-3">
                  <Banknote className="size-6 text-primary mt-1" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium line-clamp-1">{m.bank_name}</span>
                      {m.is_default && (
                        <Badge variant="default" className="gap-1">
                          <Star className="size-3 fill-current" /> Default
                        </Badge>
                      )}
                      {m.is_verified && <Badge variant="secondary">Verified</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {m.account_name} · •••• {(m.account_number ?? "").slice(-4)} · {m.country}
                    </div>
                  </div>
                  {!m.is_default && (
                    <Button size="sm" variant="outline" onClick={() => setDefault(m.id)}>
                      <Check className="size-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add bank account</DialogTitle>
          </DialogHeader>
          <form onSubmit={add} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bn">Bank name</Label>
              <Input id="bn" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="an">Account number / IBAN</Label>
              <Input id="an" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aname">Account holder name</Label>
              <Input id="aname" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}
