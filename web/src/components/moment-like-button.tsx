"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike } from "@/app/today/actions";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

// "오늘의 와비사비" 공감(좋아요) 토글 — 카드·상세 공용. 낙관적 업데이트로
// 즉시 반영하고, 서버 응답으로 정정한다. 비로그인은 로그인 화면으로 유도.
export function MomentLikeButton({
  momentId,
  initialLiked,
  initialCount,
  size = "sm",
}: {
  momentId: string;
  initialLiked: boolean;
  initialCount: number;
  size?: "sm" | "lg";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  function onClick() {
    if (!user) {
      router.push("/auth?redirect=/today");
      return;
    }
    if (pending) return;
    // 클릭 시점 값 보존(실패 시 되돌리기).
    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !prevLiked;
    setLiked(nextLiked);
    setCount(prevCount + (nextLiked ? 1 : -1));
    start(async () => {
      const res = await toggleLike(momentId);
      if (res) {
        setLiked(res.liked);
        setCount(res.count);
      } else {
        setLiked(prevLiked);
        setCount(prevCount);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? "공감 취소" : "공감"}
      className={cn(
        "inline-flex items-center gap-1 transition-colors",
        liked ? "text-red-600" : "text-wabi-fg-muted hover:text-wabi-fg",
      )}
    >
      <Heart
        className={size === "lg" ? "size-5" : "size-4"}
        fill={liked ? "currentColor" : "none"}
        strokeWidth={1.5}
      />
      <span className="font-numeric text-xs">{count}</span>
    </button>
  );
}
