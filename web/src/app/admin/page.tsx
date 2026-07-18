import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST } from "@/lib/orders";
import { OrderStatusBadge } from "@/components/order-status-badge";
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

type TrendDay = { day: string; orders: number; revenue: number };
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
  };
}

// 만원 단위 축약 — 막대 위 라벨용(1,250,000원은 좁은 칸에 안 들어간다).
function compactWon(n: number): string {
  if (n === 0) return "0";
  if (n < 10_000) return n.toLocaleString("ko-KR");
  const man = n / 10_000;
  return `${man >= 100 ? Math.round(man).toLocaleString("ko-KR") : man.toFixed(man % 1 === 0 ? 0 : 1)}만`;
}

// "YYYY-MM-DD"(KST 일자) → 요일. UTC 자정 파싱이라도 KST 로는 같은 날짜라 안전.
function weekdayKo(day: string): string {
  return new Date(day).toLocaleDateString("ko-KR", {
    weekday: "short",
    timeZone: "Asia/Seoul",
  });
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
  // 크림 배경(#205) 기준 WCAG AA — amber-700·red-600 은 크림에서 4.5:1 미달이라 한 단계 진하게.
  const text = tone === "warn" ? "text-amber-800" : "text-red-700";
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

  const { summary: s, trend, lowStock, recent } = await loadDashboard();
  const maxRevenue = Math.max(...trend.map((t) => t.revenue), 1);

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

      {/* 최근 7일 매출 추이 (KST) — 외부 차트 라이브러리 없이 CSS 막대.
          수치가 막대 위·아래 텍스트로 그대로 보이므로 별도 대체 텍스트 불요. */}
      <section>
        <h2 className="text-lg font-medium">최근 7일 매출</h2>
        <div className="mt-4 border border-wabi-border p-5">
          <div className="flex items-end justify-between gap-2">
            {trend.map((t) => (
              <div
                key={t.day}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${t.day} — 주문 ${t.orders}건 · ${won(t.revenue)}`}
              >
                <span className="text-xs text-wabi-fg-muted">
                  {compactWon(t.revenue)}
                </span>
                <div className="flex h-28 w-full max-w-12 items-end">
                  <div
                    className={
                      t.revenue > 0 ? "w-full bg-wabi-accent/80" : "w-full bg-wabi-border"
                    }
                    style={{
                      height:
                        t.revenue > 0
                          ? `${Math.max((t.revenue / maxRevenue) * 100, 4)}%`
                          : "2px",
                    }}
                  />
                </div>
                <span className="text-xs text-wabi-fg-muted">
                  {t.day.slice(5).replace("-", "/")}
                </span>
                <span className="text-[10px] text-wabi-fg-muted">
                  {weekdayKo(t.day)} · {t.orders}건
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 재고 주의 + 최근 주문 — 카드 숫자만으론 어떤 상품·주문인지 한 번 더 들어가야
          해서, 첫 화면에서 바로 보이게 목록을 둔다. */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-6">
        <section>
          <h2 className="text-lg font-medium">재고 주의 상품</h2>
          <div className="mt-4 border border-wabi-border">
            {lowStock.length === 0 ? (
              <p className="p-5 text-sm text-wabi-fg-muted">
                재고 주의 상품이 없습니다.
              </p>
            ) : (
              <ul className="divide-y divide-wabi-border">
                {lowStock.map((p) => (
                  <li key={p.id}>
                    <Link
                      href="/admin/products"
                      className="flex items-center justify-between gap-4 p-4 text-sm transition-colors hover:bg-wabi-subtle"
                    >
                      <span className="truncate">{p.name}</span>
                      <span
                        className={
                          p.stock === 0
                            ? "shrink-0 font-medium text-red-700"
                            : "shrink-0 font-medium text-amber-800"
                        }
                      >
                        {p.stock === 0 ? "품절" : `${p.stock}개`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">최근 주문</h2>
          <div className="mt-4 border border-wabi-border">
            {recent.length === 0 ? (
              <p className="p-5 text-sm text-wabi-fg-muted">주문이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-wabi-border">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      href="/admin/orders"
                      className="flex items-center justify-between gap-4 p-4 text-sm transition-colors hover:bg-wabi-subtle"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <OrderStatusBadge status={o.status} />
                        <span className="truncate">{o.recipient}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block">{won(o.total_price)}</span>
                        <span className="block text-xs text-wabi-fg-muted">
                          {formatDateKST(o.ordered_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

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
