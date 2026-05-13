"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { signIn, signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (params.get("error") === "auth_failed") {
      toast.error("Sign-in failed. Please try again.");
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) {
      setAgreeError(true);
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      router.replace("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-primary mb-2">
            SafeHome
          </Link>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to continue your search</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                className={`flex items-start gap-2 text-sm rounded-md px-2 py-1.5 -mx-2 transition-colors ${
                  agreeError
                    ? "text-destructive ring-1 ring-destructive bg-destructive/5"
                    : "text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked);
                    if (e.target.checked) setAgreeError(false);
                  }}
                  aria-invalid={agreeError}
                  className="mt-1 size-4 accent-[color:var(--brand-accent)]"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms-of-service" className="text-primary underline">
                    Terms of Use
                  </Link>{" "}
                  and Safety Rules.
                </span>
              </label>
              {agreeError && (
                <p className="mt-1 text-xs text-destructive">
                  You must agree to the Terms of Use and Safety Rules to continue.
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <span>OR</span>
            <Separator className="flex-1" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (!agree) {
                setAgreeError(true);
                return;
              }
              signInWithGoogle();
            }}
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-medium">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
