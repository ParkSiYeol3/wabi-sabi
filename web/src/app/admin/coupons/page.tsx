import {
  PageHeader,
  Panel,
  SectionHeading,
  EmptyState,
  adminAction,
} from "@/components/admin/ui";
import { SubmitButton } from "@/components/common/submit-button";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won, formatDateKST } from "@/lib/orders";
import { couponLabel, type Coupon } from "@/lib/coupons";
import { CouponCreateForm } from "@/components/admin/coupon-create-form";
import { setCouponActive } from "./actions";

type CouponRow = Coupon & {
  per_user_limit: number;
  auto_issue_signup: boolean;
  created_at: string;
};

export default async function AdminCouponsPage() {
  if (!adminConfigured()) {
    return (
      <>
        <PageHeader title="쿠폰" description="service_role 키 설정 후 이용 가능합니다." />
        <EmptyState>서버 키가 없어 쿠폰을 관리할 수 없습니다.</EmptyState>
      </>
    );
  }

  const { data } = await createAdminClient()
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CouponRow[]>();
  const coupons = data ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        title="쿠폰"
        description="할인 쿠폰을 만들고 관리합니다. 가입 축하 쿠폰은 신규 회원에게 자동 지급됩니다."
      />

      <section>
        <SectionHeading>쿠폰 등록</SectionHeading>
        <Panel className="mt-3 p-6">
          <CouponCreateForm />
        </Panel>
      </section>

      <section>
        <SectionHeading>쿠폰 목록 ({coupons.length})</SectionHeading>
        {coupons.length === 0 ? (
          <p className="mt-3 rounded-xl border border-wabi-border bg-wabi-bg/30 p-5 text-sm text-wabi-fg-muted">
            등록된 쿠폰이 없습니다.
          </p>
        ) : (
          <Panel className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-wabi-border text-left text-xs text-wabi-fg-muted">
                  <th className="p-3">코드</th>
                  <th className="p-3">할인</th>
                  <th className="p-3">최소주문</th>
                  <th className="p-3">사용/한도</th>
                  <th className="p-3">만료</th>
                  <th className="p-3">가입지급</th>
                  <th className="p-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-wabi-border/60">
                    <td className="p-3">
                      <span className="font-medium text-wabi-fg">{c.code}</span>
                      {c.description && (
                        <span className="block text-xs text-wabi-fg-muted">
                          {c.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3 tabular-nums">{couponLabel(c)}</td>
                    <td className="p-3 tabular-nums">
                      {c.min_order > 0 ? won(c.min_order) : "—"}
                    </td>
                    <td className="p-3 tabular-nums">
                      {c.used_count}
                      {c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                    </td>
                    <td className="p-3 text-xs text-wabi-fg-muted">
                      {c.expires_at ? formatDateKST(c.expires_at) : "무기한"}
                    </td>
                    <td className="p-3">{c.auto_issue_signup ? "○" : "—"}</td>
                    <td className="p-3">
                      <form action={setCouponActive} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(!c.is_active)}
                        />
                        <SubmitButton
                          pendingText="변경 중…"
                          className={adminAction({
                            tone: c.is_active ? "solid" : "outline",
                          })}
                        >
                          {c.is_active ? "활성" : "비활성"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </section>
    </div>
  );
}
