import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth/매직링크 콜백 — 코드를 세션으로 교환 후 redirect.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=oauth`);
}
