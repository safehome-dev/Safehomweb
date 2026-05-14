"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { extractIdFromParam } from "@/lib/slug";
import { CURRENCY_SYMBOLS, formatPrice } from "@/lib/currency";
import type { ServiceProvider } from "@/lib/types/database";

export default function BookServicePage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => extractIdFromParam(params?.id), [params?.id]);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { user, loading: authLoading } = useAuth();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/services/${id}/book`)}`);
      return;
    }
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("service_providers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setProvider(data as ServiceProvider | null);
      setLoading(false);
    })();
  }, [user, authLoading, id, router, supabase]);

  const quotedPrice =
    duration && provider?.hourly_rate
      ? parseFloat(duration) * Number(provider.hourly_rate)
      : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !provider) return;
    if (!serviceType || !description || !bookingDate || !location || !city) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("service_bookings").insert({
        provider_id: provider.id,
        customer_id: user.id,
        service_type: serviceType,
        service_description: description,
        booking_date: bookingDate,
        booking_time: bookingTime || null,
        duration_hours: duration ? parseFloat(duration) : null,
        service_location: location,
        city,
        quoted_price: quotedPrice || null,
        currency: provider.currency,
        customer_notes: notes || null,
        status: "pending",
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: provider.user_id,
        title: "New Service Booking",
        message: `You have a new booking request for ${serviceType}`,
        type: "system",
        action_url: "/service-bookings",
      });

      toast.success("Booking request sent.");
      router.replace("/my-service-bookings");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not book service.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
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

  if (!provider) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Service provider not found.
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <form onSubmit={onSubmit} className="container mx-auto px-4 py-6 max-w-2xl space-y-5">
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">
            Book {provider.business_name}
          </h1>
        </div>

        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Service type *</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue placeholder="Choose service" /></SelectTrigger>
              <SelectContent>
                {(provider.service_categories ?? []).map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>What do you need? *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the job in detail…"
              required
            />
          </div>
        </Card>

        <Card className="p-5 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input
              type="time"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Estimated duration (hours)</Label>
            <Input
              inputMode="decimal"
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="e.g., 2"
            />
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="space-y-1.5">
            <Label>Address *</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where should the service take place?"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>City *</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., London"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Additional notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything else the provider should know"
            />
          </div>
        </Card>

        {quotedPrice > 0 && (
          <Card className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Estimated cost ({CURRENCY_SYMBOLS[provider.currency]}{provider.hourly_rate}/hr × {duration}h)
            </span>
            <span className="font-bold text-primary text-lg">
              {formatPrice(quotedPrice, provider.currency)}
            </span>
          </Card>
        )}

        <Button type="submit" disabled={submitting} className="w-full h-12 gap-2">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Send booking request
        </Button>
      </form>
    </SiteShell>
  );
}
