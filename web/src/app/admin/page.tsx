import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { startOfTodayKstIso, won } from "@/lib/orders";

// 처리 대기·현황 요약. service_role 로 조회한다 — 미답변 문의(비밀글)·신고 내역은
// RLS 상 유저 클라이언트로는 보이지 않아 어드민 요약이 부정확해진다.
async function loadSummary() {
  const db = createAdminClient();

  // 신고된 리뷰 중 아직 숨기지 않은 것 = 처리 대기. review_id 를 모아 visible 만 카운트.
  const { data: reps } = await db.from("review_reports").select("review_id");
  const reportedIds = [...new Set((reps ?? []).map((r) => r.review_id))];
  const reportedVisible = reportedIds.length
    ? ((
        await db
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("hidden", false)
          .in("id", reportedIds)
      ).count ?? 0)
    : 0;

  const todayIso = startOfTodayKstIso();

  const [
    awaitingShip,
    shipping,
    unanswered,
    outOfStock,
    todayOrders,
  ] = await Promise.all([
    db
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "paid"),
    db
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "shipping"),
    db
      .from("inquiries")
      .select("*", { count: "exact", head: true })
      .is("answer", null),
    db
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("stock", 0),
    db
      .from("orders")
      .select("total_price")
      .gte("ordered_at", todayIso)
      .in("status", ["paid", "shipping", "delivered"])
      .returns<{ total_price: number }[]>(),
  ]);

  const todayList = todayOrders.data ?? [];
  return {
    awaitingShip: awaitingShip.count ?? 0,
    shipping: shipping.count ?? 0,
    unanswered: unanswered.count ?? 0,
    outOfStock: outOfStock.count ?? 0,
    reportedVisible,
    todayCount: todayList.length,
    todayRevenue: todayList.reduce((a, o) => a + o.total_price, 0),
  };
}

// 처리 대기 카드 — 0 이면 회색, 있으면 강조(빨강). 클릭 시 해당 관리 화면.
function ActionCard({
  href,
  label,
  count,
  unit = "건",
}: {
  href: string;
  label: string;
  count: number;
  unit?: string;
}) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className={`border p-5 transition-colors hover:bg-wabi-subtle ${
        active ? "border-red-300" : "border-wabi-border"
      }`}
    >
      <p className="text-sm text-wabi-fg-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          active ? "text-red-600" : "text-wabi-fg-muted"
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            href="/admin/orders"
            label="발송 대기"
            count={s.awaitingShip}
          />
          <ActionCard
            href="/admin/inquiries"
            label="미답변 문의"
            count={s.unanswered}
          />
          <ActionCard
            href="/admin/reviews"
            label="신고된 리뷰"
            count={s.reportedVisible}
            unit="개"
          />
          <ActionCard
            href="/admin/products"
            label="품절 상품"
            count={s.outOfStock}
            unit="개"
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
              {s.todayCount.toLocaleString("ko-KR")}
              <span className="ml-1 text-sm font-normal">건</span>
            </p>
          </div>
          <div className="border border-wabi-border p-5">
            <p className="text-sm text-wabi-fg-muted">오늘 매출</p>
            <p className="mt-1 text-2xl font-semibold">{won(s.todayRevenue)}</p>
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
