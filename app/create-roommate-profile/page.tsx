"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Loader2,
  Phone,
  Trash2,
  X,
} from "lucide-react";
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
import type { RoommateProfile } from "@/lib/types/database";

const PROFILE_TYPES = ["seeking", "offering"] as const;
const GENDERS = ["male", "female", "non-binary", "prefer-not-to-say"] as const;
const ROOM_TYPES = ["private", "shared", "studio"] as const;
const LEASE_DURATIONS = ["short-term", "mid-term", "long-term", "flexible"] as const;
const CURRENCIES = ["GBP", "NGN", "USD"] as const;

type ProfileType = (typeof PROFILE_TYPES)[number];

export default function CreateRoommateProfilePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);

  const [existingId, setExistingId] = useState<string | null>(null);
  const [profileType, setProfileType] = useState<ProfileType>("seeking");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [country, setCountry] = useState<Country>("UK");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("GBP");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [roomType, setRoomType] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [leaseDuration, setLeaseDuration] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const availableStates = useMemo(() => getStatesForCountry(country), [country]);

  // Gate: must be signed in + have a phone number on the profile (mobile requirement).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(
        `/login?next=${encodeURIComponent("/create-roommate-profile")}`
      );
      return;
    }
    if (!profile?.phone) {
      setNeedsPhone(true);
      setLoading(false);
      return;
    }
    setNeedsPhone(false);
    // Load existing profile for this type, if any (so users can edit).
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, profile?.phone, profileType]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("roommate_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("profile_type", profileType)
      .maybeSingle();
    const p = data as RoommateProfile | null;
    if (p) {
      setExistingId(p.id);
      setTitle(p.title ?? "");
      setBio(p.bio ?? "");
      setAge(p.age?.toString() ?? "");
      setGender(p.gender ?? "");
      setOccupation(p.occupation ?? "");
      setCountry((p.country as Country) ?? "UK");
      setState(p.state ?? "");
      setCity(p.city ?? "");
      setCurrency(
        (CURRENCIES as readonly string[]).includes(p.currency)
          ? (p.currency as (typeof CURRENCIES)[number])
          : "GBP"
      );
      setBudgetMin(p.budget_min?.toString() ?? "");
      setBudgetMax(p.budget_max?.toString() ?? "");
      setRentAmount(p.rent_amount?.toString() ?? "");
      setRoomType(p.room_type ?? "");
      setMoveInDate(p.move_in_date ?? "");
      setLeaseDuration(p.lease_duration ?? "");
      setImages((p.images as string[]) ?? []);
    } else {
      setExistingId(null);
    }
    setLoading(false);
  }

  async function onImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!files.length || !user) return;
    const tooBig = files.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      toast.error("Each image must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const slug = Math.random().toString(36).slice(2, 9);
        const path = `${user.id}/roommate-${Date.now()}-${slug}.${ext}`;
        const { error } = await supabase.storage
          .from("property-images")
          .upload(path, file, {
            upsert: false,
            contentType: file.type || `image/${ext}`,
          });
        if (error) throw error;
        const { data } = supabase.storage.from("property-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(i: number) {
    setImages((p) => p.filter((_, idx) => idx !== i));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !city.trim() || !country) {
      toast.error("Title, city and country are required.");
      return;
    }
    if (profileType === "seeking" && (!budgetMin || !budgetMax)) {
      toast.error("Please enter your budget range.");
      return;
    }
    if (profileType === "offering" && (!rentAmount || !roomType)) {
      toast.error("Please enter rent amount and room type.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        profile_type: profileType,
        title: title.trim(),
        bio: bio.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        occupation: occupation.trim() || null,
        city: city.trim(),
        state: state || null,
        country,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        rent_amount: rentAmount ? parseFloat(rentAmount) : null,
        currency,
        room_type: roomType || null,
        move_in_date: moveInDate || null,
        lease_duration: leaseDuration || null,
        images,
        is_active: true,
        status: "active",
        updated_at: new Date().toISOString(),
      };
      if (existingId) {
        const { error } = await supabase
          .from("roommate_profiles")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("roommate_profiles")
          .insert(payload);
        if (error) throw error;
      }
      toast.success("Roommate profile saved.");
      router.replace("/");
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
            <div>
              <h1 className="text-xl font-bold">Phone number required</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Add your phone number first so potential roommates can reach you.
              </p>
            </div>
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
      <form
        onSubmit={onSave}
        className="container mx-auto px-4 py-6 max-w-2xl space-y-5"
      >
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">
            {existingId ? "Edit roommate profile" : "Create roommate profile"}
          </h1>
        </div>

        <Card className="p-5 space-y-4">
          <Label>I am</Label>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setProfileType(t)}
                className={`px-4 py-2.5 rounded-lg border-2 text-sm font-medium cursor-pointer transition-colors ${
                  profileType === t
                    ? "border-primary bg-accent text-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                {t === "seeking" ? "Seeking a Room" : "Offering a Room"}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Professional seeking quiet room in London"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">About you</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell potential roommates about yourself…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="25"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g} className="capitalize">
                      {g.replace(/-/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g., Software Engineer"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <Label>Location *</Label>
          <Select value={country} onValueChange={(v) => setCountry(v as Country)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger>
              <SelectValue placeholder="State / Region" />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
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

        <Card className="p-5 space-y-4">
          <Label>Money</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as (typeof CURRENCIES)[number])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_SYMBOLS[c]} {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {profileType === "seeking" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bmin">Budget min *</Label>
                <Input
                  id="bmin"
                  inputMode="decimal"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bmax">Budget max *</Label>
                <Input
                  id="bmax"
                  inputMode="decimal"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="rent">Rent amount *</Label>
              <Input
                id="rent"
                inputMode="decimal"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <Label>Room preferences</Label>
          <Select value={roomType} onValueChange={setRoomType}>
            <SelectTrigger>
              <SelectValue placeholder="Room type" />
            </SelectTrigger>
            <SelectContent>
              {ROOM_TYPES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="movein">Move-in date</Label>
              <Input
                id="movein"
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lease duration</Label>
              <Select value={leaseDuration} onValueChange={setLeaseDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Lease length" />
                </SelectTrigger>
                <SelectContent>
                  {LEASE_DURATIONS.map((l) => (
                    <SelectItem key={l} value={l} className="capitalize">
                      {l.replace(/-/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <Label>Photos</Label>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((url, i) => (
                <div key={`${url}-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 size-7 rounded-full"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onImagesChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full gap-2 h-20 border-dashed"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-5" />}
            {uploading ? "Uploading…" : "Add photos"}
          </Button>
        </Card>

        <Button
          type="submit"
          disabled={saving || uploading}
          className="w-full h-12 gap-2"
        >
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
              if (!confirm("Delete this roommate profile?")) return;
              const { error } = await supabase
                .from("roommate_profiles")
                .delete()
                .eq("id", existingId);
              if (error) toast.error(error.message);
              else {
                toast.success("Profile deleted.");
                router.replace("/");
              }
            }}
          >
            <Trash2 className="size-4" /> Delete profile
          </Button>
        )}
      </form>
    </SiteShell>
  );
}
