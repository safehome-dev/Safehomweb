"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarFallback } from "@/lib/fallback-image";
import type { Profile } from "@/lib/types/database";

const USER_TYPES = [
  { id: "renter", label: "Renter" },
  { id: "lister", label: "Property Lister" },
  { id: "both", label: "Both" },
] as const;

type UserType = (typeof USER_TYPES)[number]["id"];

const MAX_BIO = 500;

export default function EditProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userType, setUserType] = useState<UserType>("renter");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/profile/edit")}`);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const p = data as Profile | null;
      if (p) {
        setName(p.name ?? "");
        setBio(p.bio ?? "");
        setPhone(p.phone ?? "");
        setCity(p.city ?? "");
        setAvatarUrl(p.avatar_url ?? "");
        const t = (p.user_type as UserType | null) ?? "renter";
        setUserType(["renter", "lister", "both"].includes(t) ? t : "renter");
      }
      setLoading(false);
    })();
  }, [user, authLoading, router, supabase]);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      // Same bucket + path scheme the mobile app uses.
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || `image/${ext}`,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("property-images").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Photo updated. Don’t forget to save.");
    } catch (err) {
      console.error(err);
      toast.error("Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: name.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        avatar_url: avatarUrl || null,
        user_type: userType,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Profile updated.");
      await refreshProfile();
      router.replace("/profile");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not save changes.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          Loading profile…
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold">Edit profile</h1>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          {/* Avatar */}
          <Card className="p-6 flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative size-28 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 cursor-pointer"
              aria-label="Change avatar"
            >
              <Avatar className="size-28">
                <AvatarImage src={avatarUrl || undefined} alt={name || "avatar"} />
                <AvatarFallback>
                  <img src={avatarFallback(name || user?.email)} alt="" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-1 right-1 size-9 rounded-full bg-primary text-primary-foreground grid place-items-center border-2 border-card">
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </div>
            </button>
            <p className="text-xs text-muted-foreground">Tap to change photo</p>
          </Card>

          {/* Personal info */}
          <Card className="p-6 space-y-5">
            <h2 className="font-semibold">Personal information</h2>

            <div className="space-y-2">
              <Label htmlFor="name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter your city"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 123 456 7890"
                required
              />
              <p className="text-xs text-muted-foreground">
                Required — this is how guests, roommates and service customers
                reach you.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
                placeholder="Tell others about yourself…"
                rows={5}
                maxLength={MAX_BIO}
              />
              <div className="text-xs text-muted-foreground text-right">
                {bio.length}/{MAX_BIO} characters
              </div>
            </div>
          </Card>

          {/* User type */}
          <Card className="p-6 space-y-3">
            <h2 className="font-semibold">I am a…</h2>
            <div className="flex flex-wrap gap-2">
              {USER_TYPES.map(({ id, label }) => {
                const active = userType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUserType(id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors cursor-pointer ${
                      active
                        ? "border-primary bg-accent text-primary"
                        : "border-transparent bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Card>

          <Button
            type="submit"
            disabled={saving || uploading || !name.trim() || !phone.trim()}
            className="w-full gap-2"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>
    </SiteShell>
  );
}
