"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, House, Plus, Search, UserPlus, Users } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultFilters, FilterSheet, type Filters } from "@/components/filter-sheet";
import { PropertiesTab } from "@/components/home/properties-tab";
import { ServicesTab } from "@/components/home/services-tab";
import { RoommatesTab } from "@/components/home/roommates-tab";
import { FriendsTab } from "@/components/home/friends-tab";
import { StoriesRail } from "@/components/stories-rail";
import { useAuth } from "@/lib/providers/auth-provider";

const CATEGORIES = [
  { value: "properties", label: "Homes", icon: House },
  { value: "services", label: "Services", icon: Briefcase },
  { value: "roommates", label: "Roommates", icon: Users },
  { value: "friends", label: "Friends", icon: UserPlus },
] as const;

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const { profile } = useAuth();

  // Mirror the mobile FAB gate: only listers / both / admins see the
  // "Create Listing" entry point. /listings/new will then enforce the
  // active-subscription paywall.
  const canList =
    profile?.role === "admin" ||
    profile?.user_type === "lister" ||
    profile?.user_type === "both";

  return (
    <SiteShell>
      <Tabs defaultValue="properties">
        {/* Search and categories sit together in one quiet band, so the page
            opens on a single clear instruction rather than a row of controls
            competing with the listings underneath. */}
        <div className="border-b bg-card">
          <div className="container mx-auto space-y-6 px-4 py-7">
            <StoriesRail />

            {/* One field, styled as the page's centrepiece. There is no submit
                button because the list filters as you type - a button that had
                nothing left to do would be decoration. */}
            <div className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border bg-background py-1.5 pl-5 pr-1.5 shadow-sm transition-shadow focus-within:shadow-md">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a city, a listing or a service"
                aria-label="Search listings"
                className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              <FilterSheet value={filters} onChange={setFilters} />
            </div>

            <TabsList
              variant="line"
              className="mx-auto h-auto w-full justify-start gap-7 overflow-x-auto bg-transparent p-0 sm:w-fit sm:justify-center"
            >
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-auto flex-none flex-col gap-1.5 rounded-none px-1 pb-2.5 pt-1 text-xs font-medium data-[state=active]:bg-transparent"
                >
                  <Icon className="size-5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <TabsContent value="properties">
            <PropertiesTab search={search} filters={filters} />
          </TabsContent>
          <TabsContent value="services">
            <ServicesTab search={search} filters={filters} />
          </TabsContent>
          <TabsContent value="roommates">
            <RoommatesTab search={search} filters={filters} />
          </TabsContent>
          <TabsContent value="friends">
            <FriendsTab search={search} />
          </TabsContent>
        </div>
      </Tabs>

      {canList && (
        <Link
          href="/listings/new"
          aria-label="Create listing"
          className="fixed right-6 bottom-24 z-30 md:bottom-8"
        >
          <Button
            size="icon"
            className="size-14 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600"
          >
            <Plus className="size-6" />
          </Button>
        </Link>
      )}
    </SiteShell>
  );
}
