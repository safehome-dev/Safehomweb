"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`SafeHome contact: ${name || "(no name)"}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name} <${email}>`);
    window.location.href = `mailto:safehometech465@gmail.com?subject=${subject}&body=${body}`;
    toast.success("Opening your email client…");
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-10 max-w-xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Contact us</h1>
          <p className="text-muted-foreground text-sm">
            Reach the SafeHome team for support, partnerships or feedback.
          </p>
        </div>
        <Card className="p-5">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              <Mail className="size-4" /> Send
            </Button>
          </form>
        </Card>
        <div className="text-sm text-muted-foreground">
          Prefer email?{" "}
          <Link href="mailto:safehometech465@gmail.com" className="text-primary underline">
            safehometech465@gmail.com
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
