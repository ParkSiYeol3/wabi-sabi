import Link from "next/link";
import {
  Truck,
  MessageCircle,
  Flag,
  PackageX,
  PackageCheck,
  TriangleAlert,
  ShoppingBag,
  Banknote,
  Users,
  Eye,
} from "lucide-react";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST, displayStatus, DELIVERY_CHECK_DAYS } from "@/lib/orders";
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
import { QuickActions } from "@/components/admin/quick-actions";
import { sourceLabel } from "@/lib/traffic-source";
import { StaffDeviceToggle } from "@/components/admin/staff-device-toggle";
import { instagramTokenStatus, type InstagramTokenStatus } from "@/lib/instagram-token";
import {
  RecentVisitors,
  type RecentVisitor,
} from "@/components/admin/recent-visitors";

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
type VisitSource = { source: string; visitors: number; views: number };

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
  preparing_at: string | null;
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
  // 배송완료 확인(#778): 배송 중인데 발송 후 DELIVERY_CHECK_DAYS 지난 주문. shipped_at
  // 이 없으면(0074 이전) 주문 시각 기준.
  const checkCutoff = new Date(Date.now() - DELIVERY_CHECK_DAYS * 86_400_000).toISOString();
  const [visitsRes, visitTrendRes, sourcesRes, peopleRes, recentVisitorsRes, instagram] =
    await Promise.all([
      db.rpc("admin_visit_summary"),
      db.rpc("admin_visit_trend", { p_days: 14 }),
      db.rpc("admin_visit_sources", { p_days: 7 }),
      // 방문자 판별·최근 방문(0070) — 마이그 전이면 없어 빈 값으로 둔다.
      db.rpc("admin_visit_people"),
      db.rpc("admin_recent_visitors", { p_limit: 30 }),
      // 인스타 토큰 자동 갱신 상태(#775). 문제 있을 때만 경고 한 줄.
      instagramTokenStatus(),
    ]);
  const visits = (visitsRes.data as VisitSummary[] | null)?.[0] ?? EMPTY_VISITS;
  const visitTrend = (visitTrendRes.data as VisitDay[] | null) ?? [];
  const visitSources = (sourcesRes.data as VisitSource[] | null) ?? [];
  const people =
    (peopleRes.data as { humans: number; unknown: number; bots: number }[] | null)?.[0] ??
    null;
  const recentVisitors = (recentVisitorsRes.data as RecentVisitor[] | null) ?? [];

  const [summaryRes, trendRes, lowStockRes, recentRes, deliveryCheckRes] = await Promise.all([
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
      .select("id, recipient, status, preparing_at, total_price, ordered_at")
      .order("ordered_at", { ascending: false })
      .limit(5)
      .throwOnError()
      .returns<RecentOrder[]>(),
    // 실패를 0건으로 숨기지 않는다(필수 조회와 같이 에러 경계로).
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "shipping")
      .or(`shipped_at.lt."${checkCutoff}",and(shipped_at.is.null,ordered_at.lt."${checkCutoff}")`)
      .throwOnError(),
  ]);
  return {
    summary: summaryRes.data as Summary,
    trend: (trendRes.data as TrendDay[] | null) ?? [],
    lowStock: lowStockRes.data ?? [],
    recent: recentRes.data ?? [],
    visits,
    visitTrend,
    visitSources,
    people,
    recentVisitors,
    instagram,
    deliveryCheck: deliveryCheckRes.count ?? 0,
    // KST 오늘 — 최근 방문 목록의 "어제" 표기용(렌더 중 Date.now 금지라 여기서 계산).
    todayKst: new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10),
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

  const {
    summary: s,
    trend,
    lowStock,
    recent,
    visits,
    visitTrend,
    visitSources,
    people,
    recentVisitors,
    instagram,
    deliveryCheck,
    todayKst,
  } =
    await loadDashboard();

  return (
    <div className="space-y-10">
      <PageHeader
        title="대시보드"
        description="처리 대기 항목과 오늘 현황을 한눈에."
      />

      {/* 바로가기(대표님) — 대시보드에서 사이드바 없이 자주 쓰는 섹션으로 원탭 이동.
          admin 진입 시 대시보드가 먼저 보이되(운영 현황), 이동은 빠르게. */}
      <QuickActions />

      <InstagramTokenNotice status={instagram} />

      {/* 처리 대기 — 모바일도 한눈에(2열 컴팩트, 대표님) */}
      <section>
        <SectionHeading>처리 대기</SectionHeading>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <StatTile
            href="/admin/orders"
            label="발송 대기"
            value={s.awaiting_ship}
            icon={Truck}
            tone="alert"
          />
          <StatTile
            href="/admin/orders"
            label="배송완료 확인"
            value={deliveryCheck}
            icon={PackageCheck}
            tone="warn"
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

      {/* 오늘 현황 (KST) — 모바일 2열 컴팩트 */}
      <section>
        <SectionHeading>오늘 현황</SectionHeading>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
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
          페이지뷰=경로 이동 수. 숫자만 여기 두고, 그래프는 바로 아래·방문 상세는 맨 아래
          (시열님 2026-09-28 — 방문 목록이 그래프를 화면 밖으로 밀어냈다). */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <SectionHeading>
            방문자 현황
            <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
              매장(관리자 제외)
            </span>
          </SectionHeading>
          {/* 로그아웃 상태로 둘러봐도 통계에 안 섞이게 — 기기마다 한 번(0070). */}
          <StaffDeviceToggle />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
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

        {/* 오늘 방문자 판별(0070) — 실제 손님이 오는지(시열님). 사람 확인 = 클릭·터치·
            키 입력을 함 / 봇 의심 = 자동화 프로그램 표시 / 미확인 = 둘 다 아님. */}
        {people && (
          <p className="mt-2 break-keep text-xs text-wabi-fg-muted">
            오늘 방문자 중{" "}
            <b className="admin-numeric font-medium text-green-800">
              사람 확인 {people.humans}
            </b>{" "}
            · 미확인 <span className="admin-numeric">{people.unknown}</span> ·{" "}
            <span className="admin-numeric text-red-700">봇 의심 {people.bots}</span>
            <span className="block sm:inline">
              {" "}
              (사람 확인 = 클릭·터치·입력을 한 방문)
            </span>
          </p>
        )}
      </section>

      {/* 추이 — 매출(#239 AreaChart)·방문자(0056 막대)를 넓은 화면에선 나란히 둬
          첫 화면 가까이에서 같이 본다. 차트만 클라이언트 컴포넌트라 recharts 번들은
          어드민 청크에 격리된다. 방문 추이는 마이그 적용 전이면 빈 배열이라 미표시. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading>최근 7일 매출</SectionHeading>
          <Panel className="mt-3 p-5">
            <RevenueChart trend={trend} />
          </Panel>
        </section>
        {visitTrend.length > 0 && (
          <section>
            <SectionHeading>최근 14일 방문자</SectionHeading>
            <Panel className="mt-3 p-5">
              <VisitorChart trend={visitTrend} />
            </Panel>
          </section>
        )}
      </div>

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
                        <OrderStatusBadge status={displayStatus(o)} />
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

      {/* 방문 상세 — 누가 어디서 왔는지(0070)·유입 경로(0067). 훑어보는 용도라 맨
          아래에 두고, 목록은 5명만 펼친다(나머지는 접힘). */}
      {(recentVisitors.length > 0 || visitSources.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          {recentVisitors.length > 0 && (
            <section>
              <SectionHeading>
                최근 방문
                <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
                  오늘·어제, 한 줄이 한 명
                </span>
              </SectionHeading>
              <Panel className="mt-3 px-5 py-2">
                <RecentVisitors rows={recentVisitors} today={todayKst} />
              </Panel>
            </section>
          )}

          {/* 유입 경로(최근 7일, 0067) — 첫 진입의 referrer·utm 을 라벨 하나로 줄여
              모은 것. 어디에 무엇을 올렸을 때 손님이 오는지 보려는 칸이다. */}
          {visitSources.length > 0 && (
            <section>
              <SectionHeading>최근 7일 유입 경로</SectionHeading>
              <Panel className="mt-3 p-5">
                <ul className="space-y-2">
                  {visitSources.slice(0, 8).map((src) => (
                    <li
                      key={src.source}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-wabi-fg">
                        {sourceLabel(src.source)}
                      </span>
                      <span className="admin-numeric shrink-0 text-xs text-wabi-fg-muted">
                        {src.visitors.toLocaleString("ko-KR")}명 ·{" "}
                        {src.views.toLocaleString("ko-KR")}회
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// 홈 인스타 피드 토큰 경고(#775). 크론이 매일 자동 갱신하므로 평소엔 아무것도 안 그린다.
// 대표님도 보는 화면이라 할 일(시열님께 알리기)까지 적는다.
function InstagramTokenNotice({ status }: { status: InstagramTokenStatus }) {
  if (status.kind === "ok") return null;
  const text =
    status.kind === "failing"
      ? `홈 인스타그램 피드 연결 자동 갱신이 ${formatDateKST(status.since)}부터 실패하고 있습니다.`
      : status.daysLeft < 0
        ? "홈 인스타그램 피드 연결이 만료되었습니다."
        : `홈 인스타그램 피드 연결이 ${status.daysLeft}일 후 만료됩니다.`;
  return (
    <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/50 p-3 text-xs text-amber-800">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text} 시열님께 알려 주세요.</span>
    </p>
  );
}
