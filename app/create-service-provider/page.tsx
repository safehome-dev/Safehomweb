"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Phone, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { COUNTRIES, getStatesForCountry, type Country } from "@/lib/location-data";
import { CURRENCY_SYMBOLS } from "@/lib/currency";
import type { ServiceProvider } from "@/lib/types/database";
import { invalidate } from "@/lib/cache";

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
];
const PRICING_TYPES = ["hourly", "fixed", "both"] as const;
const CURRENCIES = ["GBP", "NGN", "USD"] as const;

export default function CreateServiceProviderPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [country, setCountry] = useState<Country>("UK");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("GBP");
  const [hourlyRate, setHourlyRate] = useState("");
  const [pricingType, setPricingType] = useState<(typeof PRICING_TYPES)[number]>("hourly");
  const [availableHours, setAvailableHours] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  const availableStates = useMemo(() => getStatesForCountry(country), [country]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/create-service-provider")}`);
      return;
    }
    if (!profile?.phone) {
      setNeedsPhone(true);
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, profile?.phone]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("service_providers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    const p = data as ServiceProvider | null;
    if (p) {
      setExistingId(p.id);
      setBusinessName(p.business_name);
      setBio(p.bio ?? "");
      setCategories(p.service_categories ?? []);
      setCountry((p.country as Country) ?? "UK");
      setState(p.state ?? "");
      setCity(p.city ?? "");
      setCurrency(
        (CURRENCIES as readonly string[]).includes(p.currency)
          ? (p.currency as (typeof CURRENCIES)[number])
          : "GBP"
      );
      setHourlyRate(p.hourly_rate?.toString() ?? "");
      const pt = (PRICING_TYPES as readonly string[]).includes(p.pricing_type ?? "")
        ? (p.pricing_type as (typeof PRICING_TYPES)[number])
        : "hourly";
      setPricingType(pt);
      setAvailableHours(p.available_hours ?? "");
      setYearsExperience(p.years_of_experience?.toString() ?? "");
      setPortfolioImages((p.portfolio_images as string[]) ?? []);
    }
    setLoading(false);
  }

  async function onImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length || !user) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Each image must be under 10 MB.");
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const slug = Math.random().toString(36).slice(2, 9);
        const path = `${user.id}/service-${Date.now()}-${slug}.${ext}`;
        const { error } = await supabase.storage
          .from("property-images")
          .upload(path, file, { contentType: file.type || `image/${ext}` });
        if (error) throw error;
        const { data } = supabase.storage.from("property-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setPortfolioImages((p) => [...p, ...uploaded]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  function toggleCategory(c: string) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!businessName.trim() || !city.trim() || !country || categories.length === 0) {
      toast.error("Business name, location and at least one category are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        business_name: businessName.trim(),
        bio: bio.trim() || null,
        service_categories: categories,
        city: city.trim(),
        state: state || null,
        country,
        currency,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        pricing_type: pricingType,
        available_hours: availableHours.trim() || null,
        years_of_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        portfolio_images: portfolioImages,
        is_active: true,
        accepts_online_booking: true,
        updated_at: new Date().toISOString(),
      };
      if (existingId) {
        const { error } = await supabase
          .from("service_providers")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_providers").insert(payload);
        if (error) throw error;
      }
      invalidate("services:p0:");
      toast.success("Service provider profile saved.");
      router.replace("/services");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save profile.";
      toast.error(msg);
    } finally {
      setSaving(false);
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

  if (needsPhone) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-10 max-w-md">
          <Card className="p-6 text-center space-y-4">
            <div className="mx-auto size-14 rounded-full bg-amber-50 grid place-items-center">
              <Phone className="size-6 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold">Phone number required</h1>
            <p className="text-sm text-muted-foreground">
              Customers need to be able to reach you. Add your phone number first.
            </p>
            <Link href="/profile/edit">
              <Button>Add phone number</Button>
            </Link>
          </Card>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <form onSubmit={onSave} className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">
            {existingId ? "Edit service profile" : "Become a service provider"}
          </h1>
        </div>

        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="business">Business name *</Label>
            <Input
              id="business"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Briefly describe your services and experience…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Years of experience</Label>
            <Input
              inputMode="numeric"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g., 5"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <Label>Service categories *</Label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map((c) => {
              const active = categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm capitalize cursor-pointer border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <Label>Location</Label>
          <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue placeholder="State / Region" /></SelectTrigger>
            <SelectContent>
              {availableStates.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City *"
            required
          />
        </Card>

        <Card className="p-5 space-y-3">
          <Label>Pricing</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRICING_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPricingType(t)}
                className={`px-3 py-2 rounded-md text-sm capitalize cursor-pointer border ${
                  pricingType === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={currency} onValueChange={(v) => setCurrency(v as (typeof CURRENCIES)[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {CURRENCY_SYMBOLS[currency]}
              </span>
              <Input
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Rate"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Available hours</Label>
            <Input
              value={availableHours}
              onChange={(e) => setAvailableHours(e.target.value)}
              placeholder="e.g., 9am – 6pm, Mon–Sat"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <Label>Portfolio</Label>
          {portfolioImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolioImages.map((url, i) => (
                <div key={`${url}-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => setPortfolioImages((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 size-7 rounded-full"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onImagesChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full gap-2 h-20 border-dashed"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-5" />}
            {uploading ? "Uploading…" : "Add portfolio photos"}
          </Button>
        </Card>

        <Button type="submit" disabled={saving || uploading} className="w-full h-12 gap-2">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {existingId ? "Save changes" : "Create profile"}
        </Button>

        {existingId && (
          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2 text-destructive"
            onClick={async () => {
              if (!user || !existingId) return;
              if (!confirm("Delete your service provider profile?")) return;
              const { error } = await supabase
                .from("service_providers")
                .delete()
                .eq("id", existingId);
              if (error) toast.error(error.message);
              else {
                toast.success("Service profile deleted.");
                router.replace("/services");
              }
            }}
          >
            <Trash2 className="size-4" /> Delete service profile
          </Button>
        )}
      </form>
    </SiteShell>
  );
}
