import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { MomentForm } from "@/components/moment/moment-form";
import { MomentGrid } from "@/components/moment/moment-grid";
import { createClient } from "@/lib/supabase/server";
import { getMomentsPage, MOMENTS_PAGE_SIZE } from "@/lib/queries/moments";

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

  // 첫 페이지(12) — 이후는 그리드의 "더보기"가 이어붙인다.
  const { moments, hasMore } = await getMomentsPage(0, MOMENTS_PAGE_SIZE);

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-tight">오늘의 와비사비</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-wabi-fg-muted">
        손님들이 일상 속에서 우리의 그릇을 어떻게 쓰고 있는지 나누는 공간입니다.
        오늘의 한 컷을 함께 남겨주세요.
      </p>

      <div className="mt-8">
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
    </Container>
  );
}
