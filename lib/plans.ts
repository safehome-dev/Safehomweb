// Mirrors mobile LISTING_PLANS in app/listing-payment.tsx.
// Base price is always in GBP. Currency conversion routes through NGN at
// runtime using the live rates from `currency_settings`.

export interface ListingPlan {
  id: "weekly" | "standard-monthly" | "premium" | "landlord-single";
  name: string;
  description: string;
  /** Price in GBP — converted client-side for display, sent to Flutterwave in chosen currency. */
  price: number;
  duration: string;
  durationDays: number;
  perDay?: string;
  features: string[];
  recommended?: boolean;
  popular?: boolean;
}

export const LISTING_PLANS: ListingPlan[] = [
  {
    id: "weekly",
    name: "Weekly Plan",
    description: "Browse room listings for 7 days",
    price: 12,
    duration: "7 days",
    durationDays: 7,
    perDay: "£1.70/day",
    features: ["Browse room listings", "Basic messaging", "Property search filters"],
  },
  {
    id: "standard-monthly",
    name: "Standard Monthly",
    description: "Talk to Room owners for 30 days",
    price: 26,
    duration: "30 days",
    durationDays: 30,
    perDay: "£1.10/day",
    features: ["Access to talk to Room owners"],
    recommended: true,
  },
  {
    id: "premium",
    name: "Premium Plan",
    description: "Full access to all features",
    price: 58,
    duration: "30 days",
    durationDays: 30,
    features: [
      "Roommate matching",
      "Services access",
      "Room listings",
      "Friends & community features",
    ],
    popular: true,
  },
  {
    id: "landlord-single",
    name: "Landlord / Agent Single Listing",
    description: "List one property or room",
    price: 25,
    duration: "One-time",
    durationDays: 365,
    features: ["List one property/room"],
  },
];

export function getPlan(planId: string): ListingPlan | null {
  return LISTING_PLANS.find((p) => p.id === planId) ?? null;
}
