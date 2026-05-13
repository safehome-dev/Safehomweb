"use client";

import { Filter as FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Filters {
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  country: "all" | "UK" | "Nigeria";
  currency: "all" | "GBP" | "NGN" | "USD";
}

export const defaultFilters: Filters = {
  minPrice: "",
  maxPrice: "",
  minBedrooms: "",
  country: "all",
  currency: "all",
};

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

export function FilterSheet({ value, onChange }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Filters">
          <FilterIcon className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Refine results in this tab.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min-price">Min price</Label>
              <Input
                id="min-price"
                inputMode="numeric"
                value={value.minPrice}
                onChange={(e) => onChange({ ...value, minPrice: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-price">Max price</Label>
              <Input
                id="max-price"
                inputMode="numeric"
                value={value.maxPrice}
                onChange={(e) => onChange({ ...value, maxPrice: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min-bedrooms">Min bedrooms</Label>
            <Input
              id="min-bedrooms"
              inputMode="numeric"
              value={value.minBedrooms}
              onChange={(e) => onChange({ ...value, minBedrooms: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select
              value={value.country}
              onValueChange={(v) =>
                onChange({ ...value, country: v as Filters["country"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="Nigeria">Nigeria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select
              value={value.currency}
              onValueChange={(v) =>
                onChange({ ...value, currency: v as Filters["currency"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="NGN">NGN</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onChange(defaultFilters)}>
            Reset
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
