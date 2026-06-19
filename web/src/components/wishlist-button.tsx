"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  initial: boolean;
  /** 목록(마이페이지)에서 해제 시 새로고침 */
  refreshOnToggle?: boolean;
  className?: string;
};

// WSB-006/011: 위시리스트 추가/해제. 비로그인 시 /auth 유도.
export function WishlistButton({
  productId,
  initial,
  refreshOnToggle,
  className,
}: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    if (!user) {
      router.push("/auth?redirect=/shop");
      return;
    }
    const next = !on;
    setOn(next); // 낙관적
    start(async () => {
      const supabase = createClient();
      if (next) {
        await supabase
          .from("wishlist")
          .insert({ user_id: user.id, product_id: productId });
      } else {
        await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
      }
      if (refreshOnToggle) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? "위시리스트에서 제거" : "위시리스트에 추가"}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-wabi-muted disabled:opacity-50",
        className,
      )}
    >
      <Heart
        className={cn("size-5", on ? "fill-wabi-fg text-wabi-fg" : "text-wabi-fg")}
        strokeWidth={1.5}
      />
    </button>
  );
}
