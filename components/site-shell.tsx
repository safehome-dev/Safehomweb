import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { PhoneSetupBanner } from "@/components/phone-setup-banner";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <SiteHeader />
      <PhoneSetupBanner />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
