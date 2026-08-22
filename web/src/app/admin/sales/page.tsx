import Link from "next/link";
import { Banknote, ShoppingBag, Trophy } from "lucide-react";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST } from "@/lib/orders";
import {
  PageHeader,
  SectionHeading,
  Panel,
  StatTile,
  TablePanel,
  EmptyState,
} from "@/components/admin/ui";

// 매출·통계·정산 (대표님 — 데이터분석). 확정 주문(paid·배송중·배송완료)만 집계,
// 금액은 total_price(결제액) 기준. 기간 토글(건별/일/주/월/연)로 정산 내역을 보고,
// 베스트셀러로 어떤 상품이 많이 팔리는지 본다. 집계는 0052 RPC(DB·KST) — Data API
// 1,000행 제한 회피. RPC 미적용(마이그 push 전)이면 안내만 보여주고 죽지 않는다.

type PeriodRow = { label: string; orders: number; revenue: number };
type BestSeller = {
  product_id: string | null;
  name: string;
  qty: number;
  revenue: number;
};
type OrderRow = {
  order_number: string;
  ordered_at: string;
  recipient: string;
  total_price: number;
  status: string;
};

// 기간 토글 정의 — 건별은 개별 주문 목록, 나머지는 RPC 기간 집계.
const BUCKETS = {
  order: { label: "건별", count: 0 },
  day: { label: "일별", count: 30 },
  week: { label: "주별", count: 12 },
  month: { label: "월별", count: 12 },
  year: { label: "연별", count: 5 },
} as const;
type Bucket = keyof typeof BUCKETS;

function normalizeBucket(v: string | undefined): Bucket {
  return v && v in BUCKETS ? (v as Bucket) : "month";
}

const STATUS_LABEL: Record<string, string> = {
  paid: "결제완료",
  shipping: "배송중",
  delivered: "배송완료",
};

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const { bucket: bucketParam } = await searchParams;
  const bucket = normalizeBucket(bucketParam);

  if (!adminConfigured()) {
    return (
      <>
        <PageHeader
          title="매출·통계"
          description="service_role 키 설정 후 매출 집계가 표시됩니다."
        />
        <EmptyState>서버 설정(service_role)이 필요합니다.</EmptyState>
      </>
    );
  }

  const db = createAdminClient();

  // 데이터 로드 — 건별은 직접 조회, 기간은 RPC. RPC 오류(마이그 미적용)는 안내로.
  let periodRows: PeriodRow[] = [];
  let orderRows: OrderRow[] = [];
  let notReady = false;

  if (bucket === "order") {
    const { data } = await db
      .from("orders")
      .select("order_number, ordered_at, recipient, total_price, status")
      .in("status", ["paid", "shipping", "delivered"])
      .order("ordered_at", { ascending: false })
      .limit(100)
      .returns<OrderRow[]>();
    orderRows = data ?? [];
  } else {
    const { data, error } = await db.rpc("admin_sales_by_period", {
      p_bucket: bucket,
      p_count: BUCKETS[bucket].count,
    });
    if (error) notReady = true;
    periodRows = (data as PeriodRow[] | null) ?? [];
  }

  const { data: bestData, error: bestErr } = await db.rpc(
    "admin_best_sellers",
    { p_days: 30, p_limit: 10 },
  );
  if (bestErr) notReady = true;
  const best = (bestData as BestSeller[] | null) ?? [];

  const totalRevenue =
    bucket === "order"
      ? orderRows.reduce((s, o) => s + o.total_price, 0)
      : periodRows.reduce((s, r) => s + r.revenue, 0);
  const totalOrders =
    bucket === "order"
      ? orderRows.length
      : periodRows.reduce((s, r) => s + r.orders, 0);

  return (
    <div className="space-y-10">
      <PageHeader
        title="매출·통계"
        description="확정 주문(결제완료·배송중·배송완료) 기준 매출·정산·베스트셀러."
      />

      {notReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900">
          매출 집계 함수가 아직 적용되지 않았습니다. 개발(시열)이{" "}
          <code className="rounded bg-amber-100 px-1">supabase db push</code> 로
          마이그레이션(0052)을 적용하면 표시됩니다.
        </div>
      )}

      {/* 기간 토글 */}
      <nav className="flex flex-wrap gap-2">
        {(Object.keys(BUCKETS) as Bucket[]).map((b) => (
          <Link
            key={b}
            href={`/admin/sales?bucket=${b}`}
            aria-current={b === bucket}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              b === bucket
                ? "border-wabi-fg bg-wabi-fg text-wabi-bg"
                : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg"
            }`}
          >
            {BUCKETS[b].label}
          </Link>
        ))}
      </nav>

      {/* 총합 (표시 기간) */}
      <section>
        <SectionHeading>
          {BUCKETS[bucket].label} 합계
          {bucket !== "order" && (
            <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
              최근 {BUCKETS[bucket].count}
              {bucket === "day"
                ? "일"
                : bucket === "week"
                  ? "주"
                  : bucket === "month"
                    ? "개월"
                    : "년"}
            </span>
          )}
        </SectionHeading>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <StatTile
            label="매출"
            value={won(totalRevenue)}
            icon={Banknote}
            tone="accent"
          />
          <StatTile
            label="주문"
            value={totalOrders}
            unit="건"
            icon={ShoppingBag}
          />
        </div>
      </section>

      {/* 정산/매출 내역 표 */}
      <section>
        <SectionHeading>정산 내역</SectionHeading>
        {bucket === "order" ? (
          orderRows.length === 0 ? (
            <div className="mt-3">
              <EmptyState>확정된 주문이 없습니다.</EmptyState>
            </div>
          ) : (
            <div className="mt-3">
              <TablePanel>
                <table className="w-full min-w-120 text-sm">
                  <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">주문번호</th>
                      <th className="px-4 py-3 font-medium">일시</th>
                      <th className="px-4 py-3 font-medium">수령인</th>
                      <th className="px-4 py-3 font-medium">상태</th>
                      <th className="px-4 py-3 text-right font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wabi-border">
                    {orderRows.map((o) => (
                      <tr key={o.order_number}>
                        <td className="px-4 py-3 font-numeric">
                          {o.order_number}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-wabi-fg-muted">
                          {formatDateKST(o.ordered_at)}
                        </td>
                        <td className="px-4 py-3">{o.recipient}</td>
                        <td className="px-4 py-3 text-wabi-fg-muted">
                          {STATUS_LABEL[o.status] ?? o.status}
                        </td>
                        <td className="px-4 py-3 text-right font-numeric">
                          {won(o.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            </div>
          )
        ) : periodRows.every((r) => r.orders === 0) ? (
          <div className="mt-3">
            <EmptyState>표시 기간에 확정된 매출이 없습니다.</EmptyState>
          </div>
        ) : (
          <div className="mt-3">
            <TablePanel>
              <table className="w-full min-w-100 text-sm">
                <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">기간</th>
                    <th className="px-4 py-3 text-right font-medium">주문</th>
                    <th className="px-4 py-3 text-right font-medium">매출</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wabi-border">
                  {[...periodRows].reverse().map((r) => (
                    <tr key={r.label}>
                      <td className="px-4 py-3 font-numeric">{r.label}</td>
                      <td className="px-4 py-3 text-right font-numeric">
                        {r.orders}건
                      </td>
                      <td className="px-4 py-3 text-right font-numeric">
                        {won(r.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>
          </div>
        )}
      </section>

      {/* 베스트셀러 (최근 30일 판매수량순) */}
      <section>
        <SectionHeading>
          베스트셀러
          <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
            최근 30일 · 판매수량순
          </span>
        </SectionHeading>
        {best.length === 0 ? (
          <div className="mt-3">
            <EmptyState>최근 30일 판매 내역이 없습니다.</EmptyState>
          </div>
        ) : (
          <Panel className="mt-3 overflow-hidden">
            <ul className="divide-y divide-wabi-border">
              {best.map((b, i) => (
                <li
                  key={b.product_id ?? `${b.name}-${i}`}
                  className="flex items-center justify-between gap-4 p-4 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        i < 3
                          ? "bg-wabi-fg text-wabi-bg"
                          : "bg-wabi-muted text-wabi-fg-muted"
                      }`}
                    >
                      {i === 0 ? <Trophy className="size-3.5" /> : i + 1}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-numeric">{b.qty}개</span>
                    <span className="block text-xs text-wabi-fg-muted font-numeric">
                      {won(b.revenue)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </section>
    </div>
  );
}
