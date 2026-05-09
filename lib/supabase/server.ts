import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// API Route / Server Action 전용 — service_role 키 사용 (RLS 우회)
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
