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
import { couponLabel, COUPONS_ENABLED, type Coupon } from "@/lib/coupons";
import { CouponCreateForm } from "@/components/admin/coupon-create-form";
import { CouponDeleteButton } from "@/components/admin/coupon-delete-button";
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

      {!COUPONS_ENABLED && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>준비 상태입니다.</b> 지금은 쿠폰이 손님에게 노출·적용되지 않습니다(체크아웃·마이페이지 미표시).
          여기서 미리 만들어 둘 수는 있으며, 정식 오픈은 개발자(시열님)에게 요청하세요.
        </div>
      )}

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
          <>
            {/* 데스크톱(md↑) — 표. */}
            <Panel className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-180 text-sm">
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
                        <div className="flex items-center gap-2">
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
                          <CouponDeleteButton couponId={c.id} code={c.code} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {/* 모바일(md 미만) — 카드. 활성 토글이 가로스크롤 밖으로 밀리지 않게. */}
            <ul className="mt-3 space-y-3 md:hidden">
              {coupons.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-wabi-border bg-wabi-bg p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium text-wabi-fg">{c.code}</span>
                      {c.description && (
                        <span className="block text-xs text-wabi-fg-muted">
                          {c.description}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 tabular-nums text-sm text-wabi-accent">
                      {couponLabel(c)}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-wabi-fg-muted">최소주문</dt>
                      <dd className="tabular-nums">
                        {c.min_order > 0 ? won(c.min_order) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-wabi-fg-muted">사용/한도</dt>
                      <dd className="tabular-nums">
                        {c.used_count}
                        {c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-wabi-fg-muted">만료</dt>
                      <dd className="text-xs text-wabi-fg-muted">
                        {c.expires_at ? formatDateKST(c.expires_at) : "무기한"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-wabi-fg-muted">가입지급</dt>
                      <dd>{c.auto_issue_signup ? "○" : "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 space-y-2 border-t border-wabi-border pt-3">
                    <form action={setCouponActive}>
                      <input type="hidden" name="id" value={c.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(!c.is_active)}
                      />
                      <SubmitButton
                        pendingText="변경 중…"
                        className={`w-full justify-center ${adminAction({
                          tone: c.is_active ? "solid" : "outline",
                        })}`}
                      >
                        {c.is_active ? "활성 (누르면 비활성)" : "비활성 (누르면 활성)"}
                      </SubmitButton>
                    </form>
                    <CouponDeleteButton couponId={c.id} code={c.code} fullWidth />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
