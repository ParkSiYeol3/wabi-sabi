import { TriangleAlert } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { adminConfigured } from "@/lib/supabase/admin";
import { AdminSidebar } from "@/components/admin/sidebar";

// 어드민 셸 — 좌측 사이드바(데스크톱 고정 / 모바일 슬라이드) + 콘텐츠 영역.
// 크림 브랜드 톤을 유지하되 라운딩·아이콘·active 강조로 고도화(#238).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-wabi-bg text-wabi-fg md:flex">
      <AdminSidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
          {!adminConfigured() && (
            <p className="mb-6 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/50 p-3 text-xs text-amber-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 쓰기 작업(생성/수정/삭제)과
                대시보드 요약 조회는 .env.local에 service_role 키를 넣어야 동작합니다.
              </span>
            </p>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
