import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { MomentForm } from "@/components/moment/moment-form";
import { MomentGrid } from "@/components/moment/moment-grid";
import { ShopSidebar } from "@/components/shop/shop-sidebar";
import { MobileCategoryTabs } from "@/components/shop/mobile-category-tabs";
import { createClient } from "@/lib/supabase/server";
import { getMomentsPage, MOMENTS_PAGE_SIZE } from "@/lib/queries/moments";
import { getCategoryTree } from "@/lib/queries/categories";

export const metadata: Metadata = {
  title: "오늘의 와비사비",
  description:
    "손님들이 일상 속에서 와비사비의 그릇을 어떻게 쓰고 있는지 나누는 공간입니다.",
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 첫 페이지(12) — 이후는 그리드의 "더보기"가 이어붙인다. 카테고리 트리는
  // shop 과 동일한 분류 내비를 /today 에도 보여주기 위함(대표님) — 병렬 조회.
  const [{ moments, hasMore }, tree] = await Promise.all([
    getMomentsPage(0, MOMENTS_PAGE_SIZE),
    getCategoryTree(),
  ]);

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-tight">오늘의 와비사비</h1>
      {/* max-w 를 넓혀 데스크톱에서 한 줄로 붙게(대표님 — "남겨주세요."만 다음 줄로
          넘어가 이상). text-pretty 로 좁은 폭에서 줄바꿈되더라도 마지막 줄에 한
          단어만 남는(orphan) 것을 막는다. */}
      <p className="mt-3 max-w-3xl text-pretty text-sm leading-7 text-wabi-fg-muted">
        손님들이 일상 속에서 우리의 그릇을 어떻게 쓰고 있는지 나누는 공간입니다.
        오늘의 한 컷을 함께 남겨주세요.
      </p>

      {/* shop 과 동일한 분류 내비(대표님) — 분류를 누르면 해당 shop 카테고리로
          이동한다(buildShopQuery 가 /shop URL 을 만든다). "오늘의 와비사비"는
          현재 위치로 표시. 데스크톱은 좌측 사이드바(ShopSidebar), 태블릿은 가로 탭.
          모바일(<md)에선 분류를 우측 드로어(헤더 SHOP)로 옮겨(#421 shop 과 동일)
          이 가로바를 숨긴다(대표님 — 사이드바/드로어 있어 중복). 래퍼도 함께 숨겨
          빈 여백이 남지 않게 한다. */}
      <div className="mt-8 hidden md:block lg:hidden">
        <MobileCategoryTabs sp={{}} tree={tree} todayActive tabletOnly />
      </div>

      <div className="mt-8 flex items-start gap-10">
        <div className="hidden lg:block">
          <ShopSidebar sp={{}} tree={tree} todayActive />
        </div>

        <div className="min-w-0 flex-1">
          <div>
            {user ? (
              <MomentForm />
            ) : (
              <p className="border border-wabi-border bg-wabi-subtle/40 px-4 py-3 text-sm text-wabi-fg-muted">
                <Link
                  href="/auth?redirect=/today"
                  className="font-medium text-wabi-fg underline underline-offset-2"
                >
                  로그인
                </Link>{" "}
                후 사진과 이야기를 남길 수 있습니다.
              </p>
            )}
          </div>

          {/* key = 최신 글 id — 글 등록·삭제로 서버 첫 페이지가 바뀌면 그리드를 새
              데이터로 remount 한다. MomentGrid 는 initial 을 useState 초기값으로만
              쓰므로(더보기 append 유지용) prop 변경이 저절로 반영되지 않기 때문. */}
          <MomentGrid
            key={moments[0]?.id ?? "empty"}
            initial={moments}
            initialHasMore={hasMore}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </Container>
  );
}
