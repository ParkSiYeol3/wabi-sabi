import Link from "next/link";
import { Container } from "@/components/container";
import { requireAdmin } from "@/lib/admin";
import { adminConfigured } from "@/lib/supabase/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <Container className="py-12">
      <div className="flex items-center justify-between border-b border-wabi-border pb-4">
        <h1 className="text-xl font-semibold">
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
        </h1>
        <nav className="flex gap-5 text-sm" aria-label="어드민 메뉴">
          <Link href="/admin/products" className="hover:underline">
            상품
          </Link>
          <Link href="/admin/orders" className="hover:underline">
            주문
          </Link>
          <Link href="/admin/notices" className="hover:underline">
            공지
          </Link>
          <Link href="/admin/inquiries" className="hover:underline">
            문의
          </Link>
          <Link href="/admin/reviews" className="hover:underline">
            리뷰
          </Link>
          <Link href="/admin/audit" className="hover:underline">
            감사로그
          </Link>
          <Link href="/admin/errors" className="hover:underline">
            에러로그
          </Link>
          <Link href="/admin/newsletter" className="hover:underline">
            뉴스레터
          </Link>
        </nav>
      </div>

      {!adminConfigured() && (
        <p className="mt-4 border border-wabi-border bg-wabi-subtle p-3 text-xs text-wabi-fg-muted">
          ⚠️ <code>SUPABASE_SERVICE_ROLE_KEY</code> 미설정 — 쓰기 작업(생성/수정/삭제)과
          대시보드 요약 조회는 .env.local에 service_role 키를 넣어야 동작합니다.
        </p>
      )}

      <div className="mt-8">{children}</div>
    </Container>
  );
}
