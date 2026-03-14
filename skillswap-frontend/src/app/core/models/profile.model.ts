export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string | null;
  email?: string;
}

export interface ProfileUpdate {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
}
