import { adminConfigured } from "@/lib/supabase/admin";
import { refreshInstagramToken } from "@/lib/instagram-token";

// 인스타그램 장기 토큰 자동 갱신(#775). Vercel Cron(vercel.json)이 매일 03:00 KST 호출.
// 만료 30일 이내일 때만 실제로 갱신하므로 대개는 "not due" 로 끝난다.
// CRON_SECRET 으로 보호(Vercel 이 Authorization: Bearer {CRON_SECRET} 자동 첨부).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ ok: false }, { status: 401 });
  if (!adminConfigured())
    return Response.json({ ok: false, error: "server key" }, { status: 500 });

  const result = await refreshInstagramToken();
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
