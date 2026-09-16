import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Check frontend/.env.local against .env.local.example.",
  );
}

// Single shared Supabase client for the whole app.
// Used for: auth (signUp/signIn/signOut/session), Realtime subscriptions
// (e.g. match chat), and Storage uploads (venue photos, avatars).
// It is NOT used to call your own FastAPI endpoints — use apiClient.ts for that.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
