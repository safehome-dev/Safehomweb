"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultFilters, FilterSheet, type Filters } from "@/components/filter-sheet";
import { PropertiesTab } from "@/components/home/properties-tab";
import { ServicesTab } from "@/components/home/services-tab";
import { RoommatesTab } from "@/components/home/roommates-tab";
import { FriendsTab } from "@/components/home/friends-tab";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by location, title or category"
              className="pl-9 h-11 bg-card"
            />
          </div>
          <FilterSheet value={filters} onChange={setFilters} />
        </div>

        <Tabs defaultValue="properties">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="roommates">Roommates</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="mt-6">
            <PropertiesTab search={search} filters={filters} />
          </TabsContent>
          <TabsContent value="services" className="mt-6">
            <ServicesTab search={search} filters={filters} />
          </TabsContent>
          <TabsContent value="roommates" className="mt-6">
            <RoommatesTab search={search} filters={filters} />
          </TabsContent>
          <TabsContent value="friends" className="mt-6">
            <FriendsTab search={search} />
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}
