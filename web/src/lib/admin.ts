import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 어드민 이메일 허용목록 (env ADMIN_EMAILS, 콤마 구분) — 최초 부트스트랩용 fallback.
// 상시 어드민 판별은 DB profiles.role='admin' 을 사용한다.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// 현재 로그인 사용자가 어드민인지 (role='admin' 또는 env 허용목록). 리다이렉트 없음.
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "admin") return true;

  const email = (user.email || "").toLowerCase();
  return adminEmails().includes(email);
}

// 어드민 가드 — 비로그인 → /auth, 비어드민 → 홈. 통과 시 user 반환.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const email = (user.email || "").toLowerCase();
  const admin = profile?.role === "admin" || adminEmails().includes(email);
  if (!admin) redirect("/"); // 권한 없음

  return user;
}
