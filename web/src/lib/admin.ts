import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 어드민 이메일 허용목록 (env ADMIN_EMAILS, 콤마 구분)
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// 어드민 가드 — 비로그인/비허용 시 redirect. 통과 시 user 반환.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/admin");

  const allowed = adminEmails();
  const email = (user.email || "").toLowerCase();
  if (allowed.length === 0 || !allowed.includes(email)) {
    redirect("/"); // 권한 없음
  }
  return user;
}
