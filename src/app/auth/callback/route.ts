import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth`);
    }
  }

  const destination = new URL(next.startsWith("/") ? next : "/dashboard", requestUrl.origin);
  if (destination.pathname === "/dashboard") {
    destination.searchParams.set("notice", "approval");
  }

  return NextResponse.redirect(destination);
}