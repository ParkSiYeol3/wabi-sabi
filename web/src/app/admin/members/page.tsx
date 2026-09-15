import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import {
  PageHeader,
  SectionHeading,
  EmptyState,
  StatTile,
} from "@/components/admin/ui";
import { MemberList, type MemberRow } from "@/components/admin/member-list";
import { UserRound, UserPlus, Mail, ShoppingBag } from "lucide-react";

// 회원 관리(대표님, #665) — 가입한 회원 전체. '구매자 관리'는 산 사람만 보이므로 별도.
// auth.users 는 Data API 로 못 읽어 0063 admin_members RPC(service_role 전용)로 조회한다.
// 검색은 닉네임·이메일 부분 일치(?q=). RPC 미적용이면 안내만 띄우고 죽지 않는다.

const DAY = 24 * 60 * 60 * 1000;

// 최근 N일 가입 수 — 현재 시각을 읽는 계산은 렌더 밖 헬퍼로(react-hooks/purity).
function joinedWithin(rows: MemberRow[], days: number): number {
  const since = Date.now() - days * DAY;
  return rows.filter((m) => new Date(m.joined_at).getTime() >= since).length;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!adminConfigured()) {
    return (
      <>
        <PageHeader
          title="회원 관리"
          description="service_role 키 설정 후 표시됩니다."
        />
        <EmptyState>서버 설정(service_role)이 필요합니다.</EmptyState>
      </>
    );
  }

  const { q = "" } = await searchParams;
  const needle = q.trim().toLowerCase();

  const db = createAdminClient();
  const { data, error } = await db.rpc("admin_members", { p_limit: 1000 });
  const all = (data as MemberRow[] | null) ?? [];
  const rows = needle
    ? all.filter(
        (m) =>
          m.name?.toLowerCase().includes(needle) ||
          m.email?.toLowerCase().includes(needle),
      )
    : all;

  // 요약은 검색과 무관하게 전체 기준.
  const recent = joinedWithin(all, 30);
  const marketing = all.filter((m) => m.marketing === true).length;
  const buyers = all.filter((m) => m.orders > 0).length;

  return (
    <div className="space-y-10">
      <PageHeader
        title="회원 관리"
        description="가입한 회원 전체입니다. 구매 금액은 확정 주문(결제완료·배송중·배송완료) 기준. 회원 개인정보는 운영 목적으로만 열람해 주세요."
      />

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900">
          회원 조회 함수가 아직 적용되지 않았습니다. 개발(시열)이{" "}
          <code className="rounded bg-amber-100 px-1">supabase db push</code> 로
          마이그레이션(0063)을 적용하면 표시됩니다.
        </div>
      )}

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="전체 회원" value={all.length} unit="명" icon={UserRound} />
          <StatTile label="최근 30일 가입" value={recent} unit="명" icon={UserPlus} />
          <StatTile
            label="마케팅 수신 동의"
            value={marketing}
            unit="명"
            icon={Mail}
          />
          <StatTile
            label="구매한 회원"
            value={buyers}
            unit="명"
            icon={ShoppingBag}
            tone="accent"
          />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading>
            회원 목록
            <span className="ml-2 text-xs font-normal text-wabi-fg-muted">
              최근 가입 순{needle ? ` · 검색 ${rows.length}명` : ""}
            </span>
          </SectionHeading>
          <form className="flex w-full gap-2 sm:w-auto" role="search">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="닉네임·이메일 검색"
              aria-label="닉네임·이메일 검색"
              className="min-w-0 flex-1 rounded-lg border border-wabi-border bg-wabi-bg/60 px-3 py-2 text-base outline-none focus:border-wabi-fg sm:w-56 sm:text-sm"
            />
            <button
              type="submit"
              className="shrink-0 cursor-pointer rounded-lg border border-wabi-fg px-3 py-2 text-sm transition-colors hover:bg-wabi-fg hover:text-wabi-bg"
            >
              검색
            </button>
          </form>
        </div>

        <div className="mt-3">
          {rows.length === 0 ? (
            <EmptyState>
              {needle ? "검색 결과가 없습니다." : "가입한 회원이 없습니다."}
            </EmptyState>
          ) : (
            <MemberList rows={rows} />
          )}
        </div>
      </section>
    </div>
  );
}
