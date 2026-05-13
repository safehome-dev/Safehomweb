import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export default function FriendsRedirect() {
  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-10 text-center space-y-3">
        <p className="text-muted-foreground">
          Your friends list lives on the Home page&apos;s &ldquo;Friends&rdquo; tab.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/"><Button>Open Friends tab</Button></Link>
          <Link href="/find-friends"><Button variant="outline">Find friends</Button></Link>
        </div>
      </div>
    </SiteShell>
  );
}
