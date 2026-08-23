import Link from "next/link";
import {
  Truck,
  MessageCircle,
  Flag,
  PackageX,
  TriangleAlert,
  ShoppingBag,
  Banknote,
  Users,
  Eye,
} from "lucide-react";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/common/order-status-badge";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import {
  PageHeader,
  SectionHeading,
  Panel,
  StatTile,
  EmptyState,
} from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { VisitorChart, type VisitDay } from "@/components/admin/visitor-chart";

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

type TrendDay = { day: string; orders: number; revenue: number };
type VisitSummary = {
  today_views: number;
  today_visitors: number;
  d7_views: number;
  d7_visitors: number;
  d30_views: number;
  d30_visitors: number;
};
const EMPTY_VISITS: VisitSummary = {
  today_views: 0,
  today_visitors: 0,
  d7_views: 0,
  d7_visitors: 0,
  d30_views: 0,
  d30_visitors: 0,
};
type LowStockRow = { id: string; name: string; stock: number };
type RecentOrder = {
  id: string;
  recipient: string;
  status: string;
  total_price: number;
  ordered_at: string;
};

// 처리 대기·현황 요약. 집계는 DB(0024 admin_dashboard_summary·0031 admin_sales_trend
// RPC)에서 계산한다 — 원시 행을 가져와 JS 로 세면 Data API 1,000행 제한에서 매출·건수가
// 조용히 낮게 나온다. RPC 는 service_role 로만 실행 가능(security definer 라 RLS 우회 →
// 일반 사용자 호출은 401). .throwOnError() 로 조회 실패를 0 으로 숨기지 않고 에러 경계로.
// 재고 목록·최근 주문은 행 수가 작아(≤8·5) 직접 조회로 충분하다.
async function loadDashboard() {
  const db = createAdminClient();
  // 방문 요약(0054)·추이(0056)는 마이그 push 전이면 함수가 없어 에러가 난다. 대시보드
  // 전체를 죽이지 않도록 throwOnError 없이 조회하고, 실패하면 0/빈 배열로 둔다.
  const [visitsRes, visitTrendRes] = await Promise.all([
    db.rpc("admin_visit_summary"),
    db.rpc("admin_visit_trend", { p_days: 14 }),
  ]);
  const visits = (visitsRes.data as VisitSummary[] | null)?.[0] ?? EMPTY_VISITS;
  const visitTrend = (visitTrendRes.data as VisitDay[] | null) ?? [];

  const [summaryRes, trendRes, lowStockRes, recentRes] = await Promise.all([
    db
      .rpc("admin_dashboard_summary", {
        low_stock_threshold: LOW_STOCK_THRESHOLD,
      })
      .throwOnError()
      .returns<Summary>(),
    // json_agg 단일 json 값이라 .returns<배열> 은 타입 캐스트가 막힌다 — data 를 캐스트.
    db.rpc("admin_sales_trend", { p_days: 7 }).throwOnError(),
    db
      .from("products")
      .select("id, name, stock")
      .eq("is_active", true)
      .lte("stock", LOW_STOCK_THRESHOLD)
      .order("stock", { ascending: true })
      .order("name", { ascending: true })
      .limit(8)
      .throwOnError()
      .returns<LowStockRow[]>(),
    db
      .from("orders")
      .select("id, recipient, status, total_price, ordered_at")
      .order("ordered_at", { ascending: false })
      .limit(5)
      .throwOnError()
      .returns<RecentOrder[]>(),
  ]);
  return {
    summary: summaryRes.data as Summary,
    trend: (trendRes.data as TrendDay[] | null) ?? [],
    lowStock: lowStockRes.data ?? [],
    recent: recentRes.data ?? [],
    visits,
    visitTrend,
  };
}

export default async function AdminHome() {
  if (!adminConfigured()) {
    // service_role 키가 없으면 요약 수치가 부정확하다(레이아웃에 별도 경고 배너 있음).
    return (
      <>
        <PageHeader
          title="대시보드"
          description="service_role 키 설정 후 요약이 표시됩니다."
        />
        <EmptyState>
          왼쪽 메뉴에서 각 관리 페이지로 이동할 수 있습니다.
        </EmptyState>
      </>
    );
  }

  const { summary: s, trend, lowStock, recent, visits, visitTrend } =
    await loadDashboard();

  return (
    <div className="space-y-10">
      <PageHeader
        title="대시보드"
        description="처리 대기 항목과 오늘 현황을 한눈에."
      />

      {/* 처리 대기 */}
      <section>
        <SectionHeading>처리 대기</SectionHeading>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            href="/admin/orders"
            label="발송 대기"
            value={s.awaiting_ship}
            icon={Truck}
            tone="alert"
          />
          <StatTile
            href="/admin/inquiries"
            label="미답변 문의"
            value={s.unanswered}
            icon={MessageCircle}
            tone="alert"
          />
          <StatTile
            href="/admin/reviews"
            label="신고된 리뷰"
            value={s.reported_reviews}
            unit="개"
            icon={Flag}
            tone="alert"
          />
          <StatTile
            href="/admin/products"
            label="품절 상품"
            value={s.out_of_stock}
            unit="개"
            icon={PackageX}
            tone="alert"
          />
          <StatTile
            href="/admin/products"
            label={`재고 부족 (${LOW_STOCK_THRESHOLD}개 이하)`}
            value={s.low_stock}
            unit="개"
            icon={TriangleAlert}
            tone="warn"
          />
        </div>
      </section>

      {/* 오늘 현황 (KST) */}
      <section>
        <SectionHeading>오늘 현황</SectionHeading>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile
            label="오늘 주문"
            value={s.today_orders}
            unit="건"
            icon={ShoppingBag}
          />
          <StatTile
            label="오늘 매출"
            value={won(s.today_revenue)}
            icon={Banknote}
            tone="accent"
          />
          <StatTile label="배송 중" value={s.shipping} unit="건" icon={Truck} />
        </div>
      </section>

      {/* 방문자 현황 (KST) — 자체 카운터(0054). 순방문자=visitor_id distinct,
          페이지뷰=경로 이동 수. 유입경로·기기 등 상세는 Vercel Analytics 대시보드. */}
      <section>
        <SectionHeading>
          방문자 현황
          <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
            매장(어드민 제외)
          </span>
        </SectionHeading>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile
            label="오늘 방문자"
            value={visits.today_visitors}
            unit="명"
            icon={Users}
            tone="accent"
          />
          <StatTile
            label="오늘 페이지뷰"
            value={visits.today_views}
            unit="회"
            icon={Eye}
          />
          <StatTile
            label="최근 7일 방문자"
            value={visits.d7_visitors}
            unit="명"
            icon={Users}
          />
        </div>

        {/* 일별 방문자 추이(최근 14일) — 마이그(0056) 적용 전이면 빈 배열이라 미표시. */}
        {visitTrend.length > 0 && (
          <Panel className="mt-3 p-5">
            <p className="mb-2 text-xs text-wabi-fg-muted">
              최근 14일 방문자 추이
            </p>
            <VisitorChart trend={visitTrend} />
          </Panel>
        )}
      </section>

      {/* 최근 7일 매출 추이 (KST) — recharts AreaChart(#239, 진입 애니메이션).
          차트만 클라이언트 컴포넌트라 recharts 번들은 어드민 청크에 격리된다. */}
      <section>
        <SectionHeading>최근 7일 매출</SectionHeading>
        <Panel className="mt-3 p-5">
          <RevenueChart trend={trend} />
        </Panel>
      </section>

      {/* 재고 주의 + 최근 주문 — 카드 숫자만으론 어떤 상품·주문인지 한 번 더 들어가야
          해서, 첫 화면에서 바로 보이게 목록을 둔다. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading>재고 주의 상품</SectionHeading>
          {lowStock.length === 0 ? (
            <p className="mt-3 rounded-xl border border-wabi-border bg-wabi-bg/30 p-5 text-sm text-wabi-fg-muted">
              재고 주의 상품이 없습니다.
            </p>
          ) : (
            <Panel className="mt-3 overflow-hidden">
              <ul className="divide-y divide-wabi-border">
                {lowStock.map((p) => (
                  <li key={p.id}>
                    <Link
                      href="/admin/products"
                      className="flex items-center justify-between gap-4 p-4 text-sm transition-colors hover:bg-wabi-muted/50"
                    >
                      <span className="truncate">{p.name}</span>
                      <span
                        className={
                          p.stock === 0
                            ? "shrink-0 font-medium text-red-700 tabular-nums"
                            : "shrink-0 font-medium text-amber-800 tabular-nums"
                        }
                      >
                        {p.stock === 0 ? "품절" : `${p.stock}개`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>

        <section>
          <SectionHeading>최근 주문</SectionHeading>
          {recent.length === 0 ? (
            <p className="mt-3 rounded-xl border border-wabi-border bg-wabi-bg/30 p-5 text-sm text-wabi-fg-muted">
              주문이 없습니다.
            </p>
          ) : (
            <Panel className="mt-3 overflow-hidden">
              <ul className="divide-y divide-wabi-border">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      href="/admin/orders"
                      className="flex items-center justify-between gap-4 p-4 text-sm transition-colors hover:bg-wabi-muted/50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <OrderStatusBadge status={o.status} />
                        <span className="truncate">{o.recipient}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block tabular-nums">
                          {won(o.total_price)}
                        </span>
                        <span className="block text-xs text-wabi-fg-muted">
                          {formatDateKST(o.ordered_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </section>
      </div>
    </div>
  );
}
