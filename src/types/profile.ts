// Defines the structure for a user profile, typically fetched from the 'profiles' table.
export interface Profile {
  id: string; // Corresponds to auth.users.id and profiles.id
  display_name: string;
  avatar_url?: string | null; // Optional avatar URL
  updated_at?: string; // Optional timestamp
}