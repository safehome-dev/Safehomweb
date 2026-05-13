// Hand-rolled types matching the live Supabase schema.
// (Generated types could be added later via `supabase gen types`.)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  name: string | null;
  role: "user" | "admin" | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  user_type: "renter" | "lister" | "both" | string | null;
  city: string | null;
  preferred_currency: string | null;
  is_suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  terms_accepted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Property {
  id: string;
  lister_id: string;
  title: string;
  description: string;
  property_type: string;
  price: number;
  currency: string | null;
  bedrooms: number;
  bathrooms: number;
  location_address: string;
  location_city: string;
  location_state: string | null;
  location_country: string;
  images: string[] | null;
  video_urls: string[];
  amenities: string[] | null;
  rules: string | null;
  available_from: string | null;
  available_to: string | null;
  is_available: boolean | null;
  rental_type: "rent" | "sale" | string | null;
  approval_status: "pending" | "approved" | "rejected" | string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ServiceProvider {
  id: string;
  user_id: string;
  business_name: string;
  bio: string | null;
  service_categories: string[];
  city: string;
  state: string | null;
  country: string;
  service_areas: string[] | null;
  hourly_rate: number | null;
  currency: string;
  pricing_type: string | null;
  available_days: string[] | null;
  available_hours: string | null;
  portfolio_images: string[] | null;
  years_of_experience: number | null;
  total_jobs_completed: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  accepts_online_booking: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface RoommateProfile {
  id: string;
  user_id: string;
  profile_type: "seeking" | "has_room" | string;
  title: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  city: string;
  state: string | null;
  country: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  rent_amount: number | null;
  property_id: string | null;
  room_type: string | null;
  available_from: string | null;
  available_to: string | null;
  preferences: Record<string, string> | null;
  move_in_date: string | null;
  lease_duration: string | null;
  is_active: boolean | null;
  status: "active" | "paused" | string;
  images: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  property_id: string | null;
  message: string;
  is_read: boolean | null;
  message_status: "sent" | "delivered" | "read" | string | null;
  reactions: Json | null;
  reply_to_message_id: string | null;
  created_at: string | null;
}

export interface Wishlist {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string | null;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked" | "rejected" | string;
  created_at: string;
  updated_at: string;
}

export interface CurrencySetting {
  id: string;
  currency_code: string;
  currency_name: string;
  exchange_rate_to_ngn: number;
  is_active: boolean | null;
  payment_provider: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean | null;
  action_url: string | null;
  metadata: Json | null;
  created_at: string | null;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  target_type: string;
  target_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  auto_blocked: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string | null;
  property_id: string | null;
  rating: number;
  comment: string | null;
  review_type: string;
  created_at: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: "active" | "expired" | "cancelled" | string | null;
  starts_at: string | null;
  expires_at: string | null;
  price: number | null;
  currency: string | null;
  auto_renew: boolean | null;
  created_at: string | null;
}

// Loose Database type — only used to parameterise the supabase-js client
// so its `.from('table')` returns sensible defaults. We rely on the row
// interfaces above for actual reading.
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      properties: { Row: Property; Insert: Partial<Property>; Update: Partial<Property> };
      service_providers: { Row: ServiceProvider; Insert: Partial<ServiceProvider>; Update: Partial<ServiceProvider> };
      roommate_profiles: { Row: RoommateProfile; Insert: Partial<RoommateProfile>; Update: Partial<RoommateProfile> };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> };
      wishlists: { Row: Wishlist; Insert: Partial<Wishlist>; Update: Partial<Wishlist> };
      friendships: { Row: Friendship; Insert: Partial<Friendship>; Update: Partial<Friendship> };
      currency_settings: { Row: CurrencySetting; Insert: Partial<CurrencySetting>; Update: Partial<CurrencySetting> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      user_blocks: { Row: UserBlock; Insert: Partial<UserBlock>; Update: Partial<UserBlock> };
      content_reports: { Row: ContentReport; Insert: Partial<ContentReport>; Update: Partial<ContentReport> };
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> };
      subscriptions: { Row: Subscription; Insert: Partial<Subscription>; Update: Partial<Subscription> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
