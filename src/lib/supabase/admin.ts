import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client with service role key
 * USE ONLY FOR ADMIN OPERATIONS (user deletion, etc.)
 * Never expose to client-side code - server-side only
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
