import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") || "/studio/tts";
  const destination = new URL(next.startsWith("/") ? next : "/studio/tts", requestUrl.origin);
  return NextResponse.redirect(destination);
}