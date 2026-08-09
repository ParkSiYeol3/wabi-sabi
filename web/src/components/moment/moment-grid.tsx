"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import type { MomentCard } from "@/lib/queries/moments";
import { loadMoreMoments, deleteMoment } from "@/app/today/actions";
import { MomentLikeButton } from "@/components/moment/moment-like-button";
import { SubmitButton } from "@/components/common/submit-button";

// 게시판 목록 — 더보기 페이지네이션(0039). 첫 페이지는 서버가 넘기고, 이후는
// loadMoreMoments 로 이어붙인다. 카드 클릭 → 상세(/today/[id]).
export function MomentGrid({
  initial,
  initialHasMore,
  currentUserId,
}: {
  initial: MomentCard[];
  initialHasMore: boolean;
  currentUserId?: string;
}) {
  const [moments, setMoments] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, start] = useTransition();

  function loadMore() {
    start(async () => {
      const res = await loadMoreMoments(moments.length);
      setMoments((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...res.moments.filter((m) => !seen.has(m.id))];
      });
      setHasMore(res.hasMore);
    });
  }

  if (moments.length === 0)
    return (
      <p className="mt-16 text-center text-sm text-wabi-fg-muted">
        아직 올라온 이야기가 없습니다. 첫 번째 순간을 남겨보세요.
      </p>
    );

  return (
    <>
      <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {moments.map((m, i) => (
          <li
            key={m.id}
            className="group flex flex-col border border-wabi-border bg-wabi-bg"
          >
            <Link
              href={`/today/${m.id}`}
              className="relative block aspect-square overflow-hidden bg-wabi-muted"
            >
              <Image
                src={m.image_url}
                alt={m.body ? m.body.slice(0, 60) : `${m.author_name}의 순간`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                // 첫 모바일 행(2장)은 above-the-fold LCP 후보 → 즉시 로드.
                // 여러 장이라 preload 대신 loading=eager (Next 16 이미지 문서 권고).
                loading={i < 2 ? "eager" : "lazy"}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <div className="flex flex-1 flex-col gap-2 p-3">
              {m.body && (
                <Link
                  href={`/today/${m.id}`}
                  className="line-clamp-2 text-sm leading-6 text-wabi-fg"
                >
                  {m.body}
                </Link>
              )}
              {/* 공감·댓글 수 */}
              <div className="mt-1 flex items-center gap-3">
                <MomentLikeButton
                  momentId={m.id}
                  initialLiked={m.liked}
                  initialCount={m.like_count}
                />
                <Link
                  href={`/today/${m.id}`}
                  className="inline-flex items-center gap-1 text-xs text-wabi-fg-muted transition-colors hover:text-wabi-fg"
                  aria-label={`댓글 ${m.comment_count}개`}
                >
                  <MessageCircle className="size-4" strokeWidth={1.5} />
                  <span className="font-numeric">{m.comment_count}</span>
                </Link>
              </div>
              <div className="mt-auto flex items-center justify-between text-xs text-wabi-fg-muted">
                <span>{m.author_name}</span>
                <span className="flex items-center gap-2">
                  <time className="font-numeric">
                    {new Date(m.created_at).toLocaleDateString("ko-KR")}
                  </time>
                  {currentUserId === m.user_id && (
                    <form
                      action={deleteMoment}
                      onSubmit={() =>
                        setMoments((prev) => prev.filter((x) => x.id !== m.id))
                      }
                    >
                      <input type="hidden" name="id" value={m.id} />
                      <SubmitButton
                        pendingText="삭제 중…"
                        className="cursor-pointer text-red-700 underline-offset-2 hover:underline"
                      >
                        삭제
                      </SubmitButton>
                    </form>
                  )}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="border border-wabi-fg px-8 py-3 text-sm transition-colors hover:bg-wabi-fg hover:text-wabi-bg disabled:opacity-60"
          >
            {pending ? "불러오는 중…" : "더보기"}
          </button>
        </div>
      )}
    </>
  );
}
