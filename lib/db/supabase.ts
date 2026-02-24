import { createClient as _createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseAnonKey) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");

/**
 * Browser / client-component Supabase client.
 * Uses the public anon key — safe to expose in the browser.
 */
export const supabase = _createClient(supabaseUrl, supabaseAnonKey);

/** Named factory — mirrors the server client API for consistent imports */
export function createClient() {
  return supabase;
}
