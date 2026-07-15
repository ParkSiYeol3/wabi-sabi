import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";

type Summary = {
  awaiting_ship: number;
  shipping: number;
  unanswered: number;
  out_of_stock: number;
  low_stock: number;
  reported_reviews: number;
  today_orders: number;
  today_revenue: number;
};

// 처리 대기·현황 요약. 집계는 DB(0024 admin_dashboard_summary RPC)에서 계산한다 —
// 원시 행을 가져와 JS 로 세면 Data API 1,000행 제한에서 매출·건수가 조용히 낮게 나온다.
// service_role 로만 실행 가능(security definer 라 RLS 우회 → 일반 사용자 호출은 401).
// .throwOnError() 로 조회 실패를 0 으로 숨기지 않고 에러 경계로 보낸다.
async function loadSummary(): Promise<Summary> {
  const db = createAdminClient();
  const { data } = await db
    .rpc("admin_dashboard_summary", {
      low_stock_threshold: LOW_STOCK_THRESHOLD,
    })
    .throwOnError()
    .returns<Summary>();
  return data as Summary;
}

// 처리 대기 카드 — 0 이면 회색, 있으면 강조. tone: alert(빨강, 즉시 처리)·warn(주황, 주의).
function ActionCard({
  href,
  label,
  count,
  unit = "건",
  tone = "alert",
}: {
  href: string;
  label: string;
  count: number;
  unit?: string;
  tone?: "alert" | "warn";
}) {
  const active = count > 0;
  const border = tone === "warn" ? "border-amber-300" : "border-red-300";
  // amber-600 은 흰 배경 대비 ~3.2:1 로 작은 텍스트 WCAG AA(4.5:1) 미달 → 700.
  const text = tone === "warn" ? "text-amber-700" : "text-red-600";
  return (
    <Link
      href={href}
      className={`border p-5 transition-colors hover:bg-wabi-subtle ${
        active ? border : "border-wabi-border"
      }`}
    >
      <p className="text-sm text-wabi-fg-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          active ? text : "text-wabi-fg-muted"
        }`}
      >
        {count.toLocaleString("ko-KR")}
        <span className="ml-1 text-sm font-normal">{unit}</span>
      </p>
    </Link>
  );
}

export default async function AdminHome() {
  if (!adminConfigured()) {
    // service_role 키가 없으면 요약 수치가 부정확하다(레이아웃에 별도 경고 배너 있음).
    return <LinkGrid />;
  }

  const s = await loadSummary();

  return (
    <div className="space-y-10">
      {/* 처리 대기 */}
      <section>
        <h2 className="text-lg font-medium">처리 대기</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ActionCard
            href="/admin/orders"
            label="발송 대기"
            count={s.awaiting_ship}
          />
          <ActionCard
            href="/admin/inquiries"
            label="미답변 문의"
            count={s.unanswered}
          />
          <ActionCard
            href="/admin/reviews"
            label="신고된 리뷰"
            count={s.reported_reviews}
            unit="개"
          />
          <ActionCard
            href="/admin/products"
            label="품절 상품"
            count={s.out_of_stock}
            unit="개"
          />
          <ActionCard
            href="/admin/products"
            label={`재고 부족 (${LOW_STOCK_THRESHOLD}개 이하)`}
            count={s.low_stock}
            unit="개"
            tone="warn"
          />
        </div>
      </section>

      {/* 오늘 현황 (KST) */}
      <section>
        <h2 className="text-lg font-medium">오늘 현황</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="border border-wabi-border p-5">
            <p className="text-sm text-wabi-fg-muted">오늘 주문</p>
            <p className="mt-1 text-2xl font-semibold">
              {s.today_orders.toLocaleString("ko-KR")}
              <span className="ml-1 text-sm font-normal">건</span>
            </p>
          </div>
          <div className="border border-wabi-border p-5">
            <p className="text-sm text-wabi-fg-muted">오늘 매출</p>
            <p className="mt-1 text-2xl font-semibold">{won(s.today_revenue)}</p>
          </div>
          <div className="border border-wabi-border p-5">
            <p className="text-sm text-wabi-fg-muted">배송 중</p>
            <p className="mt-1 text-2xl font-semibold text-wabi-fg-muted">
              {s.shipping.toLocaleString("ko-KR")}
              <span className="ml-1 text-sm font-normal">건</span>
            </p>
          </div>
        </div>
      </section>

      {/* 바로가기 */}
      <section>
        <h2 className="text-lg font-medium">관리</h2>
        <div className="mt-4">
          <LinkGrid />
        </div>
      </section>
    </div>
  );
}

function LinkGrid() {
  const items = [
    { href: "/admin/products", title: "상품 관리", desc: "상품 등록·수정·재고·노출" },
    { href: "/admin/orders", title: "주문 관리", desc: "주문 조회·송장 입력" },
    { href: "/admin/inquiries", title: "문의", desc: "고객 문의 답변" },
    { href: "/admin/reviews", title: "리뷰", desc: "신고 처리·숨김·삭제" },
    { href: "/admin/audit", title: "감사로그", desc: "어드민 액션 기록 조회" },
    { href: "/admin/errors", title: "에러 로그", desc: "클라이언트 에러 조회" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="border border-wabi-border p-6 transition-colors hover:bg-wabi-subtle"
        >
          <h3 className="font-medium">{it.title}</h3>
          <p className="mt-1 text-sm text-wabi-fg-muted">{it.desc}</p>
        </Link>
      ))}
    </div>
  );
}
