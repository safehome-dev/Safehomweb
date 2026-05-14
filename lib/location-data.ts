// Same shape as the mobile app's `@/lib/location-data` — keeping them in sync
// so listings created on either client share the same location vocabulary.

export const COUNTRIES = ["UK", "Nigeria"] as const;
export type Country = (typeof COUNTRIES)[number];

export const STATES: Record<Country, string[]> = {
  UK: ["England", "Scotland", "Wales", "Northern Ireland"],
  Nigeria: [
    "Abia",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Bayelsa",
    "Benue",
    "Borno",
    "Cross River",
    "Delta",
    "Ebonyi",
    "Edo",
    "Ekiti",
    "Enugu",
    "FCT",
    "Gombe",
    "Imo",
    "Jigawa",
    "Kaduna",
    "Kano",
    "Katsina",
    "Kebbi",
    "Kogi",
    "Kwara",
    "Lagos",
    "Nasarawa",
    "Niger",
    "Ogun",
    "Ondo",
    "Osun",
    "Oyo",
    "Plateau",
    "Rivers",
    "Sokoto",
    "Taraba",
    "Yobe",
    "Zamfara",
  ],
};

export function getStatesForCountry(country: string): string[] {
  return STATES[country as Country] ?? [];
}
