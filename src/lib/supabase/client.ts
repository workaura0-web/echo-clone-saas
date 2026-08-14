import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// طریقہ A: اگر آپ createClient فنکشن برآمد کرنا چاہتے ہیں
export const createClient = () => createSupabaseClient(supabaseUrl, supabaseAnonKey);

// یا طریقہ B: اگر آپ براہ راست supabase کا انسٹینس برآمد کرنا چاہتے ہیں
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);