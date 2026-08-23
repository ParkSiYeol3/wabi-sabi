import Link from "next/link";
import { Trophy, ChevronDown } from "lucide-react";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST } from "@/lib/orders";
import {
  PageHeader,
  SectionHeading,
  Panel,
  TablePanel,
  EmptyState,
} from "@/components/admin/ui";

// 매출·통계·정산 (대표님 — 데이터분석). 금액은 total_price(결제액) 기준.
//  ① 매출 요약 — 상태 3섹션(결제완료 / 배송중·완료 / 미결제·취소환불) 스냅샷.
//  ② 정산 조회 — 시작일~종료일 + 구분(상태)으로 기간 내 주문·합계(스마트스토어식).
//  ③ 베스트셀러 — 최근 30일 판매수량순.
// 집계는 0052·0053 RPC(DB·KST). RPC 미적용(마이그 push 전)이면 안내만 띄우고 죽지 않음.

type StatusRow = { status: string; orders: number; revenue: number };
type BestSeller = {
  product_id: string | null;
  name: string;
  qty: number;
  revenue: number;
};
type OrderItem = { product_name: string | null; quantity: number };
type OrderRow = {
  order_number: string;
  ordered_at: string;
  recipient: string;
  total_price: number;
  status: string;
  order_items: OrderItem[] | null;
};

// 주문 항목 셀 — 한 건이면 상품명, 여러 건이면 "첫상품 외 N건" + 펼쳐보기(대표님).
// 네이티브 <details> 라 서버 컴포넌트에서 그대로 동작(클라 JS 불필요).
function ItemsCell({ items }: { items: OrderItem[] | null }) {
  const list = (items ?? []).filter(
    (i): i is OrderItem & { product_name: string } => Boolean(i.product_name),
  );
  if (list.length === 0) return <span>—</span>;
  if (list.length === 1) return <span>{list[0].product_name}</span>;
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1 marker:content-none">
        <span>
          {list[0].product_name} 외 {list.length - 1}건
        </span>
        <ChevronDown
          className="size-3.5 shrink-0 text-wabi-fg-muted transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="mt-1.5 space-y-0.5 text-xs text-wabi-fg-muted">
        {list.map((it, i) => (
          <li key={i}>
            {it.product_name}{" "}
            <span className="font-numeric">×{it.quantity}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "미결제",
  paid: "결제완료",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소·환불",
};

// 정산 조회 '구분' 선택지 — 상태 필터. confirmed=확정 매출(기본).
const FILTERS = {
  confirmed: { label: "확정 매출", statuses: ["paid", "shipping", "delivered"] },
  all: { label: "전체", statuses: [] as string[] },
  paid: { label: "결제완료", statuses: ["paid"] },
  shipping: { label: "배송중", statuses: ["shipping"] },
  delivered: { label: "배송완료", statuses: ["delivered"] },
  pending: { label: "미결제", statuses: ["pending"] },
  cancelled: { label: "취소·환불", statuses: ["cancelled"] },
} as const;
type FilterKey = keyof typeof FILTERS;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// KST 기준 오늘/오프셋 날짜(YYYY-MM-DD). 서버 렌더 시점(동적).
function kstDate(offsetDays = 0): string {
  const t = Date.now() + 9 * 3600_000 + offsetDays * 86400_000;
  return new Date(t).toISOString().slice(0, 10);
}

// 3섹션 요약 카드 — 상태 그룹별 건수·금액.
function SummaryCard({
  label,
  hint,
  orders,
  revenue,
  tone,
}: {
  label: string;
  hint: string;
  orders: number;
  revenue: number;
  tone: "accent" | "ok" | "muted";
}) {
  const ring =
    tone === "accent"
      ? "border-wabi-accent/40"
      : tone === "ok"
        ? "border-emerald-300"
        : "border-wabi-border";
  const amount =
    tone === "accent"
      ? "text-wabi-accent"
      : tone === "ok"
        ? "text-emerald-700"
        : "text-wabi-fg-muted";
  return (
    <div className={`rounded-xl border ${ring} bg-wabi-bg/50 p-5`}>
      <p className="text-sm font-medium text-wabi-fg">{label}</p>
      <p className="mt-0.5 text-xs text-wabi-fg-muted">{hint}</p>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${amount}`}>
        {won(revenue)}
      </p>
      <p className="mt-1 font-numeric text-sm text-wabi-fg-muted">
        {orders}건
      </p>
    </div>
  );
}

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const sp = await searchParams;

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
  let notReady = false;

  // ── 상태별 요약(전체 스냅샷) ──
  const { data: statusData, error: statusErr } = await db.rpc(
    "admin_order_status_summary",
  );
  if (statusErr) notReady = true;
  const statusRows = (statusData as StatusRow[] | null) ?? [];
  const sum = (statuses: string[]) =>
    statusRows
      .filter((r) => statuses.includes(r.status))
      .reduce(
        (a, r) => ({ orders: a.orders + r.orders, revenue: a.revenue + r.revenue }),
        { orders: 0, revenue: 0 },
      );
  const gPaid = sum(["paid"]);
  const gDeliver = sum(["shipping", "delivered"]);
  const gVoid = sum(["pending", "cancelled"]);

  // ── 정산 조회(날짜 범위 + 구분) ──
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : kstDate(-30);
  const to = sp.to && DATE_RE.test(sp.to) ? sp.to : kstDate(0);
  const filterKey: FilterKey =
    sp.status && sp.status in FILTERS ? (sp.status as FilterKey) : "confirmed";
  const filter = FILTERS[filterKey];
  // KST 하루 경계를 UTC ISO 로. from 00:00 ~ to 23:59:59.999 (KST).
  const fromISO = new Date(`${from}T00:00:00+09:00`).toISOString();
  const toISO = new Date(`${to}T23:59:59.999+09:00`).toISOString();

  let settleQ = db
    .from("orders")
    .select(
      "order_number, ordered_at, recipient, total_price, status, order_items(product_name, quantity)",
    )
    .gte("ordered_at", fromISO)
    .lte("ordered_at", toISO)
    .order("ordered_at", { ascending: false })
    .limit(300);
  if (filter.statuses.length) settleQ = settleQ.in("status", filter.statuses);
  const { data: settleData } = await settleQ.returns<OrderRow[]>();
  const settleRows = settleData ?? [];
  const settleRevenue = settleRows.reduce((s, o) => s + o.total_price, 0);

  // ── 베스트셀러 ──
  const { data: bestData, error: bestErr } = await db.rpc("admin_best_sellers", {
    p_days: 30,
    p_limit: 10,
  });
  if (bestErr) notReady = true;
  const best = (bestData as BestSeller[] | null) ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        title="매출·통계"
        description="상태별 매출 요약 · 기간 정산 조회 · 베스트셀러. 금액은 결제액(total_price) 기준."
      />

      {notReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900">
          매출 집계 함수가 아직 적용되지 않았습니다. 개발(시열)이{" "}
          <code className="rounded bg-amber-100 px-1">supabase db push</code> 로
          마이그레이션(0052·0053)을 적용하면 표시됩니다.
        </div>
      )}

      {/* ① 매출 요약 — 상태 3섹션 */}
      <section>
        <SectionHeading>매출 요약</SectionHeading>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <SummaryCard
            label="결제 완료"
            hint="발송 대기 매출"
            orders={gPaid.orders}
            revenue={gPaid.revenue}
            tone="accent"
          />
          <SummaryCard
            label="배송 중 · 배송 완료"
            hint="진행·완료 매출"
            orders={gDeliver.orders}
            revenue={gDeliver.revenue}
            tone="ok"
          />
          <SummaryCard
            label="미결제 · 취소/환불"
            hint="미수·취소 (취소=환불 포함)"
            orders={gVoid.orders}
            revenue={gVoid.revenue}
            tone="muted"
          />
        </div>
      </section>

      {/* ② 정산 조회 — 날짜 범위 + 구분 */}
      <section>
        <SectionHeading>정산 조회</SectionHeading>
        <Panel className="mt-3 p-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
              시작일
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="rounded-lg border border-wabi-border bg-wabi-bg/60 px-3 py-2 text-sm font-numeric outline-none focus:border-wabi-fg"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
              종료일
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="rounded-lg border border-wabi-border bg-wabi-bg/60 px-3 py-2 text-sm font-numeric outline-none focus:border-wabi-fg"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-wabi-fg-muted">
              구분
              <select
                name="status"
                defaultValue={filterKey}
                className="h-[38px] rounded-lg border border-wabi-border bg-wabi-bg/60 px-3 text-sm outline-none focus:border-wabi-fg"
              >
                {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
                  <option key={k} value={k}>
                    {FILTERS[k].label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-wabi-accent px-5 py-2 text-sm text-white transition-colors hover:bg-wabi-accent/90"
            >
              검색
            </button>
            <Link
              href="/admin/sales"
              className="rounded-lg border border-wabi-border px-4 py-2 text-sm text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
            >
              초기화
            </Link>
          </form>

          {/* 조회 결과 합계 */}
          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-wabi-border pt-4">
            <span className="text-sm text-wabi-fg-muted">
              {from} ~ {to} · {filter.label}
            </span>
            <span className="text-sm">
              <span className="text-wabi-fg-muted">합계 </span>
              <b className="text-lg tabular-nums text-wabi-fg">
                {won(settleRevenue)}
              </b>
              <span className="ml-2 font-numeric text-wabi-fg-muted">
                {settleRows.length}건
              </span>
            </span>
          </div>
        </Panel>

        {settleRows.length === 0 ? (
          <div className="mt-3">
            <EmptyState>해당 조건의 주문이 없습니다.</EmptyState>
          </div>
        ) : (
          <div className="mt-3">
            {/* 모바일 — 스택 카드(가로 스크롤 없이). 상품은 펼쳐보기 지원 */}
            <ul className="space-y-2 sm:hidden">
              {settleRows.map((o) => (
                <li
                  key={o.order_number}
                  className="rounded-xl border border-wabi-border bg-wabi-bg/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-sm text-wabi-fg">
                      <ItemsCell items={o.order_items} />
                    </div>
                    <span className="shrink-0 font-numeric text-sm font-medium text-wabi-fg">
                      {won(o.total_price)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-wabi-fg-muted">
                    <span>{formatDateKST(o.ordered_at)}</span>
                    <span>·</span>
                    <span>{o.recipient}</span>
                    <span>·</span>
                    <span>{STATUS_LABEL[o.status] ?? o.status}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* 데스크톱 — 테이블 */}
            <div className="hidden sm:block">
              <TablePanel>
                <table className="w-full min-w-120 text-sm">
                  <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">상품</th>
                      <th className="px-4 py-3 font-medium">일시</th>
                      <th className="px-4 py-3 font-medium">수령인</th>
                      <th className="px-4 py-3 font-medium">상태</th>
                      <th className="px-4 py-3 text-right font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wabi-border">
                    {settleRows.map((o) => (
                      <tr key={o.order_number}>
                        <td className="px-4 py-3 align-top text-wabi-fg">
                          <ItemsCell items={o.order_items} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-wabi-fg-muted">
                          {formatDateKST(o.ordered_at)}
                        </td>
                        <td className="px-4 py-3 align-top">{o.recipient}</td>
                        <td className="px-4 py-3 align-top text-wabi-fg-muted">
                          {STATUS_LABEL[o.status] ?? o.status}
                        </td>
                        <td className="px-4 py-3 text-right align-top font-numeric">
                          {won(o.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            </div>
            {settleRows.length >= 300 && (
              <p className="mt-2 text-xs text-wabi-fg-muted">
                최근 300건만 표시됩니다. 기간을 좁혀 조회하세요.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ③ 베스트셀러 */}
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
                    <span className="block font-numeric text-xs text-wabi-fg-muted">
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
