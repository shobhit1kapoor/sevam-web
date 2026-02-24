import "server-only";
import { createClient as _createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

/**
 * Server-only Supabase admin client (service role key).
 * Bypasses Row Level Security — never use in client components.
 */
export const supabaseAdmin = _createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/** Named factory — mirrors the browser client API so imports are consistent */
export function createClient() {
  return supabaseAdmin;
}
