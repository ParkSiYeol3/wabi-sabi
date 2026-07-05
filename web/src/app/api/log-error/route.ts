import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

// 클라이언트 에러 수집 (0014) — error.tsx 가 POST. service_role 로 기록.
// 무인증 공개 엔드포인트라 남용 표면: content-type·크기 가드 + 필드 길이 절단.
// user_id 는 클라 값 불신 — 서버 세션에서 확정.
export async function POST(req: Request) {
  const ct = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (ct !== "application/json") return new Response(null, { status: 415 });

  const raw = await req.text().catch(() => "");
  if (raw.length === 0 || raw.length > 8_192)
    return new Response(null, { status: 413 });

  let payload: { digest?: unknown; message?: unknown; url?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!adminConfigured()) return new Response(null, { status: 204 });

  const str = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

  // 로그인 사용자면 user_id 첨부(세션 기준, 위조 불가)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const admin = createAdminClient();
    await admin.from("client_error_log").insert({
      digest: str(payload.digest, 100),
      message: str(payload.message, 1_000),
      url: str(payload.url, 500),
      user_agent: str(req.headers.get("user-agent"), 500),
      user_id: user?.id ?? null,
    });
  } catch (e) {
    console.error("[log-error] 기록 실패", e);
  }
  return new Response(null, { status: 204 });
}
