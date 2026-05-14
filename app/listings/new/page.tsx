"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Images as ImagesIcon,
  Info,
  Loader2,
  Lock,
  MapPin,
  Star,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSubscriptionActive } from "@/lib/subscription";
import { CURRENCY_SYMBOLS } from "@/lib/currency";
import { COUNTRIES, getStatesForCountry, type Country } from "@/lib/location-data";
import type { Subscription } from "@/lib/types/database";

const PROPERTY_TYPES = ["house", "apartment", "room", "shared", "studio"] as const;
const RENTAL_TYPES = ["short-term", "mid-term", "long-term", "any"] as const;
const CURRENCIES = ["GBP", "NGN", "USD"] as const;
const DEFAULT_AMENITIES = [
  "WiFi",
  "Parking",
  "Air Conditioning",
  "Heating",
  "Washer",
  "Dryer",
  "Kitchen",
  "TV",
  "Gym",
  "Pool",
  "Elevator",
  "Security",
  "Pet Friendly",
  "Garden",
  "Balcony",
];

const TITLE_MAX = 80;
const DESC_MAX = 5000;
// Bucket `property-images` accepts up to 80 MB; we keep images smaller for
// page-load sanity but allow videos up to the full cap.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB (~60s at typical phone bitrate)

type PropertyType = (typeof PROPERTY_TYPES)[number];
type RentalType = (typeof RENTAL_TYPES)[number];
type Currency = (typeof CURRENCIES)[number];

export default function NewListingPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [checkingSub, setCheckingSub] = useState(true);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);

  // Form state — mirrors mobile create-listing.tsx
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [rentalType, setRentalType] = useState<RentalType>("any");

  const [currency, setCurrency] = useState<Currency>("GBP");
  const [price, setPrice] = useState("");

  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");

  const [country, setCountry] = useState<Country>("UK");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [imgProgress, setImgProgress] = useState(0);
  const [vidProgress, setVidProgress] = useState(0);

  const [knownAmenities, setKnownAmenities] = useState<string[]>(DEFAULT_AMENITIES);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");

  const [rules, setRules] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Subscription gate (admins bypass)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/listings/new")}`);
      return;
    }
    let cancelled = false;
    (async () => {
      if (profile?.role === "admin") {
        if (!cancelled) {
          setActiveSub({
            id: "admin",
            user_id: user.id,
            plan_type: "admin",
            status: "active",
            starts_at: null,
            expires_at: null,
            price: null,
            currency: null,
            auto_renew: null,
            created_at: null,
          });
          setCheckingSub(false);
        }
        return;
      }
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const sub = ((data ?? [])[0] as Subscription | undefined) ?? null;
      setActiveSub(isSubscriptionActive(sub) ? sub : null);
      setCheckingSub(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, profile?.role, router, supabase]);

  const availableStates = useMemo(() => getStatesForCountry(country), [country]);
  useEffect(() => {
    // Reset state when country changes (mobile behaviour)
    setStateRegion("");
  }, [country]);

  // ─── Uploads ────────────────────────────────────────────────────────────
  async function uploadFiles(
    files: File[],
    kind: "image" | "video"
  ): Promise<string[]> {
    if (!user) return [];
    const urls: string[] = [];
    const setProgress = kind === "image" ? setImgProgress : setVidProgress;
    setProgress(0);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.name.split(".").pop() ?? (kind === "image" ? "jpg" : "mp4")).toLowerCase();
      const slug = Math.random().toString(36).slice(2, 9);
      const path =
        kind === "image"
          ? `${user.id}/${Date.now()}-${slug}.${ext}`
          : `${user.id}/videos/${Date.now()}-${slug}.${ext}`;
      const { error } = await supabase.storage
        .from("property-images")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || (kind === "image" ? `image/${ext}` : `video/${ext}`),
        });
      if (error) throw error;
      const { data } = supabase.storage.from("property-images").getPublicUrl(path);
      urls.push(data.publicUrl);
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    return urls;
  }

  async function onImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (!list.length) return;
    const tooBig = list.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      toast.error("Each image must be under 10 MB.");
      return;
    }
    setUploadingImages(true);
    try {
      const urls = await uploadFiles(list, "image");
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Could not upload one or more images.");
    } finally {
      setUploadingImages(false);
      setImgProgress(0);
    }
  }

  async function onVideosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (!list.length) return;
    const tooBig = list.find((f) => f.size > MAX_VIDEO_BYTES);
    if (tooBig) {
      toast.error("Each video must be under 80 MB (~60s at typical bitrate).");
      return;
    }
    setUploadingVideos(true);
    try {
      const urls = await uploadFiles(list, "video");
      setVideos((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Could not upload one or more videos.");
    } finally {
      setUploadingVideos(false);
      setVidProgress(0);
    }
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }
  function removeVideo(i: number) {
    setVideos((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveImage(i: number, dir: "left" | "right") {
    setImages((prev) => {
      const next = [...prev];
      const target = dir === "left" ? i - 1 : i + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }

  // ─── Amenities ──────────────────────────────────────────────────────────
  function toggleAmenity(a: string) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }
  function addCustomAmenity() {
    const v = customAmenity.trim();
    if (!v) return;
    if (amenities.includes(v) || knownAmenities.includes(v)) {
      setCustomAmenity("");
      return;
    }
    setKnownAmenities((p) => [...p, v]);
    setAmenities((p) => [...p, v]);
    setCustomAmenity("");
  }

  // ─── Submit ─────────────────────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!activeSub) {
      toast.error("You need an active subscription to post a listing.");
      return;
    }
    if (!title.trim()) return toast.error("Please enter a property title.");
    if (!description.trim()) return toast.error("Please enter a description.");
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) return toast.error("Please enter a valid price.");
    if (!address.trim() || !city.trim())
      return toast.error("Please enter the property address and city.");
    if (images.length === 0 && videos.length === 0)
      return toast.error("Please upload at least one image or video.");

    setSubmitting(true);
    try {
      const { error } = await supabase.from("properties").insert({
        lister_id: user.id,
        title: title.trim(),
        description: description.trim(),
        property_type: propertyType,
        rental_type: rentalType,
        price: priceNum,
        currency,
        bedrooms: parseInt(bedrooms || "0", 10) || 0,
        bathrooms: parseInt(bathrooms || "0", 10) || 0,
        location_address: address.trim(),
        location_city: city.trim(),
        location_state: stateRegion || null,
        location_country: country,
        images,
        video_urls: videos,
        amenities,
        rules: rules.trim() || null,
        available_from: availableFrom || null,
        available_to: availableTo || null,
        is_available: true,
        approval_status: "pending",
      });
      if (error) throw error;
      toast.success("Listing submitted for review.");
      router.replace("/profile");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not create listing.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Gates ──────────────────────────────────────────────────────────────
  if (authLoading || checkingSub) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          Checking posting access…
        </div>
      </SiteShell>
    );
  }

  if (!activeSub) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-10 max-w-2xl">
          <Card className="p-6 space-y-4 text-center">
            <div className="mx-auto size-14 rounded-full bg-amber-50 grid place-items-center">
              <Lock className="size-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Subscription required</h1>
              <p className="text-sm text-muted-foreground mt-1">
                You need an active subscription to publish property listings.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href="/listing-payment?returnTo=/listings/new">
                <Button className="gap-2">
                  <CreditCard className="size-4" /> Choose a plan
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to home</Button>
              </Link>
            </div>
          </Card>
        </div>
      </SiteShell>
    );
  }

  // ─── Form ───────────────────────────────────────────────────────────────
  return (
    <SiteShell>
      <form
        onSubmit={onSubmit}
        className="container mx-auto px-4 py-6 max-w-3xl space-y-5"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Create Property Listing</h1>
          {activeSub.plan_type && activeSub.plan_type !== "admin" && (
            <Badge variant="secondary" className="capitalize">
              {activeSub.plan_type}
            </Badge>
          )}
        </div>

        {/* Basic information */}
        <Section icon={Info} title="Basic Information">
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="e.g., Spacious 2-Bedroom Apartment in Central London"
              maxLength={TITLE_MAX}
              required
            />
            <CharCount value={title.length} max={TITLE_MAX} />
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              placeholder="Describe your property in detail…"
              rows={6}
              maxLength={DESC_MAX}
              required
            />
            <CharCount value={description.length} max={DESC_MAX} />
          </Field>

          <Field label="Property Type">
            <Pills
              options={PROPERTY_TYPES.map((p) => ({
                value: p,
                label: p[0].toUpperCase() + p.slice(1),
              }))}
              value={propertyType}
              onChange={(v) => setPropertyType(v as PropertyType)}
            />
          </Field>

          <Field label="Rental Type">
            <Pills
              options={RENTAL_TYPES.map((r) => ({
                value: r,
                label: r
                  .split("-")
                  .map((w) => w[0].toUpperCase() + w.slice(1))
                  .join(" "),
              }))}
              value={rentalType}
              onChange={(v) => setRentalType(v as RentalType)}
            />
          </Field>
        </Section>

        {/* Pricing */}
        <Section icon={CreditCard} title="Pricing">
          <Field label="Currency">
            <Pills
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
            />
          </Field>
          <Field label="Price per month">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {CURRENCY_SYMBOLS[currency] ?? currency}
              </span>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                inputMode="decimal"
                className="pl-8"
                required
              />
            </div>
          </Field>
        </Section>

        {/* Property details */}
        <Section icon={Info} title="Property Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bedrooms">
              <Input
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g., 2"
                inputMode="numeric"
              />
            </Field>
            <Field label="Bathrooms">
              <Input
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g., 1"
                inputMode="numeric"
              />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section icon={MapPin} title="Location">
          <Field label="Country">
            <Pills
              options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              value={country}
              onChange={(v) => setCountry(v as Country)}
            />
          </Field>

          <Field label="State / Region">
            <select
              value={stateRegion}
              onChange={(e) => setStateRegion(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select state/region</option>
              {availableStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="City">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., London, Lagos"
              required
            />
          </Field>

          <Field label="Detailed address / location">
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., Banana Island, House 3 opposite Magistrate Court"
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Be specific — this helps people find your property.
            </p>
          </Field>
        </Section>

        {/* Images */}
        <Section icon={ImagesIcon} title="Property Images">
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                  <div className="absolute top-2 left-2 size-6 rounded-full bg-black/70 text-white text-xs font-bold grid place-items-center">
                    {i + 1}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    aria-label="Remove image"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 size-7 rounded-full"
                  >
                    <X className="size-4" />
                  </Button>
                  <div className="absolute bottom-2 inset-x-2 flex justify-between">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Move left"
                      disabled={i === 0}
                      onClick={() => moveImage(i, "left")}
                      className="size-7 rounded-full"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Move right"
                      disabled={i === images.length - 1}
                      onClick={() => moveImage(i, "right")}
                      className="size-7 rounded-full"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onImagesChange}
            className="hidden"
          />
          <Dropzone
            disabled={uploadingImages || uploadingVideos}
            uploading={uploadingImages}
            progress={imgProgress}
            onClick={() => imageInputRef.current?.click()}
            hint={
              images.length
                ? `${images.length} image${images.length === 1 ? "" : "s"} added — click to add more`
                : "Click to add photos"
            }
            sub="Drop files in or choose from your device"
            icon={ImagesIcon}
          />
        </Section>

        {/* Videos */}
        <Section icon={VideoIcon} title="Property Videos (Optional)">
          <p className="text-sm text-muted-foreground">
            Upload short walkthrough videos. Aim for ~60 seconds each (max 80 MB).
          </p>

          {videos.length > 0 && (
            <ul className="space-y-2">
              {videos.map((url, i) => (
                <li
                  key={`${url}-${i}`}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <VideoIcon className="size-5 text-primary" />
                  <span className="flex-1 text-sm truncate">Video {i + 1}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove video"
                    onClick={() => removeVideo(i)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={onVideosChange}
            className="hidden"
          />
          <Dropzone
            disabled={uploadingImages || uploadingVideos}
            uploading={uploadingVideos}
            progress={vidProgress}
            onClick={() => videoInputRef.current?.click()}
            hint={
              videos.length
                ? `${videos.length} video${videos.length === 1 ? "" : "s"} added — click to add more`
                : "Click to add videos"
            }
            sub="MP4, MOV or WebM — up to 80 MB each"
            icon={VideoIcon}
          />
        </Section>

        {/* Amenities */}
        <Section icon={Star} title="Amenities">
          <div className="flex flex-wrap gap-2">
            {knownAmenities.map((a) => {
              const active = amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <Input
              value={customAmenity}
              onChange={(e) => setCustomAmenity(e.target.value)}
              placeholder="Add custom amenity"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomAmenity();
                }
              }}
            />
            <Button type="button" onClick={addCustomAmenity} disabled={!customAmenity.trim()}>
              Add
            </Button>
          </div>
        </Section>

        {/* Rules */}
        <Section icon={Info} title="Property Rules (Optional)">
          <Textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="e.g., No smoking, No pets, Quiet hours after 10 PM"
            rows={4}
          />
        </Section>

        {/* Availability */}
        <Section icon={Calendar} title="Availability (Optional)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Available from">
              <Input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
              />
            </Field>
            <Field label="Available to">
              <Input
                type="date"
                value={availableTo}
                min={availableFrom || undefined}
                onChange={(e) => setAvailableTo(e.target.value)}
              />
              {availableTo && (
                <button
                  type="button"
                  onClick={() => setAvailableTo("")}
                  className="text-xs text-destructive mt-1"
                >
                  Clear end date
                </button>
              )}
            </Field>
          </div>
        </Section>

        <Button
          type="submit"
          disabled={submitting || uploadingImages || uploadingVideos}
          className="w-full gap-2 h-12 text-base"
        >
          {submitting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-5" />
          )}
          {submitting ? "Submitting…" : "Create listing"}
        </Button>

        <p className="text-xs text-muted-foreground text-center pb-6">
          New listings are reviewed by SafeHome before they appear publicly. You&apos;ll
          be notified once it&apos;s approved.
        </p>
      </form>
    </SiteShell>
  );
}

// ─── Bits ──────────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function CharCount({ value, max }: { value: number; max: number }) {
  return (
    <div className="text-xs text-muted-foreground text-right">
      {value}/{max} characters
    </div>
  );
}

interface PillOption {
  value: string;
  label: string;
}
function Pills({
  options,
  value,
  onChange,
}: {
  options: PillOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm border cursor-pointer transition-colors ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Dropzone({
  disabled,
  uploading,
  progress,
  onClick,
  hint,
  sub,
  icon: Icon,
}: {
  disabled: boolean;
  uploading: boolean;
  progress: number;
  onClick: () => void;
  hint: string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center bg-muted/40 hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {uploading ? (
        <div className="space-y-2">
          <Loader2 className="size-7 mx-auto animate-spin text-primary" />
          <div className="text-sm font-medium text-primary">
            Uploading… {progress}%
          </div>
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Icon className="size-7 mx-auto text-muted-foreground" />
          <div className="text-sm font-medium">{hint}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      )}
    </button>
  );
}
