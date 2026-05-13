"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/lib/providers/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Message, Profile } from "@/lib/types/database";
import { avatarFallback } from "@/lib/fallback-image";

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!userId) return;

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      setOther(profile as Profile | null);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
      setLoading(false);

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("sender_id", userId)
        .eq("is_read", false);
    })();

    const channel = supabase
      .channel(`chat-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: Message }) => {
          const m = payload.new;
          const between =
            (m.sender_id === user.id && m.recipient_id === userId) ||
            (m.sender_id === userId && m.recipient_id === user.id);
          if (between) {
            setMessages((prev) => [...prev, m]);
            if (m.recipient_id === user.id) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", m.id)
                .then();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, userId, router, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !userId || !draft.trim()) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const { error, data } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: userId,
        message: body,
        is_read: false,
        message_status: "sent",
      })
      .select("*")
      .single();
    setSending(false);
    if (error) {
      setDraft(body);
      return;
    }
    if (data) setMessages((prev) => [...prev, data as Message]);
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-6 max-w-2xl">
        <div className="flex flex-col h-[calc(100vh-9rem)] sm:h-[calc(100vh-12rem)] bg-card sm:rounded-xl sm:border overflow-hidden">
          <div className="flex items-center gap-3 p-3 border-b">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="size-4" />
            </Button>
            <Link href={`/u/${userId}`} className="flex items-center gap-3 min-w-0">
              <Avatar className="size-9">
                <AvatarImage src={other?.avatar_url ?? undefined} />
                <AvatarFallback>
                  <img src={avatarFallback(other?.name ?? "user")} alt="" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium line-clamp-1">{other?.name ?? "Conversation"}</div>
                {other?.city && (
                  <div className="text-xs text-muted-foreground line-clamp-1">{other.city}</div>
                )}
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-2/3" />
              ))
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                Say hi to start the conversation.
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-accent text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t p-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </SiteShell>
  );
}
