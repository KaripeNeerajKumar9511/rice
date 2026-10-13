import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
let client: SupabaseClient<Database> | null = null;
export function getSupabase() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return null;
 if(!client)client=createClient<Database>(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return client;
}
