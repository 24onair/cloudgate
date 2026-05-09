import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 브라우저 / 서버 컴포넌트 모두 사용 가능한 클라이언트
export const supabase = createClient<Database>(url, anon);
