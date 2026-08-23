import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST } from "@/lib/orders";
import {
  PageHeader,
  SectionHeading,
  TablePanel,
  EmptyState,
  StatTile,
} from "@/components/admin/ui";
import { Users, UserCheck, Banknote } from "lucide-react";

// 구매자 관리(대표님 — 분석 스위트 B). 구매자별 구매 횟수·금액.
// 회원은 user_id, 비회원은 전화번호로 묶는다(0055 admin_customers RPC·확정 주문만).
// 금액은 total_price(결제액) 합. RPC 미적용이면 안내만 띄우고 죽지 않는다.

type Row = {
  label: string;
  contact: string | null;
  is_member: boolean;
  orders: number;
  amount: number;
  last_ordered: string;
};

export default async function AdminCustomersPage() {
  if (!adminConfigured()) {
    return (
      <>
        <PageHeader
          title="구매자 관리"
          description="service_role 키 설정 후 표시됩니다."
        />
        <EmptyState>서버 설정(service_role)이 필요합니다.</EmptyState>
      </>
    );
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("admin_customers", { p_limit: 200 });
  const rows = (data as Row[] | null) ?? [];

  const members = rows.filter((r) => r.is_member).length;
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-10">
      <PageHeader
        title="구매자 관리"
        description="구매자별 구매 횟수·금액. 회원은 계정, 비회원은 전화번호로 묶습니다. 확정 주문(결제완료·배송중·배송완료) 기준."
      />

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900">
          집계 함수가 아직 적용되지 않았습니다. 개발(시열)이{" "}
          <code className="rounded bg-amber-100 px-1">supabase db push</code> 로
          마이그레이션(0055)을 적용하면 표시됩니다.
        </div>
      )}

      {/* 요약 */}
      <section>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="구매자" value={rows.length} unit="명" icon={Users} />
          <StatTile
            label="회원 구매자"
            value={members}
            unit="명"
            icon={UserCheck}
          />
          <StatTile
            label="누적 구매액"
            value={won(totalAmount)}
            icon={Banknote}
            tone="accent"
          />
        </div>
      </section>

      {/* 목록 — 구매액 큰 순 */}
      <section>
        <SectionHeading>
          구매자 목록
          <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
            구매액 큰 순
          </span>
        </SectionHeading>
        {rows.length === 0 ? (
          <div className="mt-3">
            <EmptyState>구매 내역이 없습니다.</EmptyState>
          </div>
        ) : (
          <div className="mt-3">
            <TablePanel>
              <table className="w-full min-w-120 text-sm">
                <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">구매자</th>
                    <th className="px-4 py-3 font-medium">구분</th>
                    <th className="px-4 py-3 text-right font-medium">구매 횟수</th>
                    <th className="px-4 py-3 text-right font-medium">구매액</th>
                    <th className="px-4 py-3 font-medium">최근 구매</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wabi-border">
                  {rows.map((r, i) => (
                    <tr key={`${r.label}-${r.contact ?? i}`}>
                      <td className="px-4 py-3">
                        <span className="block truncate font-medium text-wabi-fg">
                          {r.label}
                        </span>
                        {r.contact && (
                          <span className="block truncate text-xs text-wabi-fg-muted">
                            {r.contact}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            r.is_member
                              ? "rounded-full bg-wabi-fg px-2 py-0.5 text-[10px] text-wabi-bg"
                              : "rounded-full border border-wabi-border px-2 py-0.5 text-[10px] text-wabi-fg-muted"
                          }
                        >
                          {r.is_member ? "회원" : "비회원"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-numeric">
                        {r.orders}
                      </td>
                      <td className="px-4 py-3 text-right font-numeric font-medium text-wabi-fg">
                        {won(r.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-wabi-fg-muted">
                        {formatDateKST(r.last_ordered)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>
          </div>
        )}
      </section>
    </div>
  );
}
