import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import { LOW_STOCK_THRESHOLD, isLowStock } from "@/lib/inventory";
import {
  PageHeader,
  SectionHeading,
  TablePanel,
  EmptyState,
  StatTile,
} from "@/components/admin/ui";
import { Boxes, PackageX, TriangleAlert } from "lucide-react";

// 재고 관리(대표님 — 분석 스위트 C). 현재고 + 누적 판매수량·판매액(상품별).
// 집계는 0055 admin_inventory_status RPC(DB·확정 주문만). 판매수량=order_items 수량 합.
// RPC 미적용(마이그 push 전)이면 안내만 띄우고 죽지 않는다.

type Row = {
  product_id: string;
  name: string;
  stock: number;
  is_active: boolean;
  sold: number;
  revenue: number;
};

export default async function AdminInventoryPage() {
  if (!adminConfigured()) {
    return (
      <>
        <PageHeader
          title="재고 관리"
          description="service_role 키 설정 후 표시됩니다."
        />
        <EmptyState>서버 설정(service_role)이 필요합니다.</EmptyState>
      </>
    );
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("admin_inventory_status");
  const rows = (data as Row[] | null) ?? [];

  const outOfStock = rows.filter((r) => r.stock <= 0).length;
  const lowStock = rows.filter((r) => r.stock > 0 && isLowStock(r.stock)).length;
  const totalStock = rows.reduce((s, r) => s + r.stock, 0);

  return (
    <div className="space-y-10">
      <PageHeader
        title="재고 관리"
        description="상품별 현재고와 누적 판매수량. 판매수량은 확정 주문(결제완료·배송중·배송완료) 기준."
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
          <StatTile label="총 재고" value={totalStock} unit="개" icon={Boxes} />
          <StatTile
            label="품절"
            value={outOfStock}
            unit="개"
            icon={PackageX}
            tone={outOfStock > 0 ? "alert" : "neutral"}
          />
          <StatTile
            label={`재고 부족 (${LOW_STOCK_THRESHOLD}개 이하)`}
            value={lowStock}
            unit="개"
            icon={TriangleAlert}
            tone={lowStock > 0 ? "warn" : "neutral"}
          />
        </div>
      </section>

      {/* 목록 — 재고 적은 순 → 많이 팔린 순 */}
      <section>
        <SectionHeading>
          상품별 재고 · 판매
          <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
            재고 적은 순
          </span>
        </SectionHeading>
        {rows.length === 0 ? (
          <div className="mt-3">
            <EmptyState>상품이 없습니다.</EmptyState>
          </div>
        ) : (
          <div className="mt-3">
            <TablePanel>
              <table className="w-full min-w-120 text-sm">
                <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">상품</th>
                    <th className="px-4 py-3 text-right font-medium">현재고</th>
                    <th className="px-4 py-3 text-right font-medium">누적 판매</th>
                    <th className="px-4 py-3 text-right font-medium">판매액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wabi-border">
                  {rows.map((r) => (
                    <tr key={r.product_id}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span className="truncate">{r.name}</span>
                          {!r.is_active && (
                            <span className="shrink-0 rounded border border-wabi-border px-1.5 py-0.5 text-[10px] text-wabi-fg-muted">
                              숨김
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-numeric">
                        {r.stock <= 0 ? (
                          <span className="font-medium text-red-700">품절</span>
                        ) : isLowStock(r.stock) ? (
                          <span className="font-medium text-amber-800">
                            {r.stock}
                          </span>
                        ) : (
                          r.stock
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-numeric">
                        {r.sold}
                      </td>
                      <td className="px-4 py-3 text-right font-numeric text-wabi-fg-muted">
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
    </div>
  );
}
