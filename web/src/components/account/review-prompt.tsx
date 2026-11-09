import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { ReviewLink } from "@/components/account/review-link";

// 마이페이지 리뷰 안내(#919). 배송완료된 주문에서 아직 리뷰를 안 쓴 판매 중 상품이 있으면
// 주문·배송 바로 위에 보여 준다. 다 쓰면 사라진다. 메일은 소식 받기 동의 회원만 받지만,
// 이 안내는 사이트 안이라 구매 회원 누구에게나 보인다.

export type PendingReview = { productId: string; name: string; image: string | null };

const SHOWN = 3;

export function ReviewPrompt({ items }: { items: PendingReview[] }) {
  if (items.length === 0) return null;
  const more = items.length - SHOWN;
  return (
    <section className="mt-14" aria-labelledby="review-prompt-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="review-prompt-title" className="text-lg font-medium">
          받으신 기물은 어떠셨나요?
        </h2>
        {more > 0 && (
          <Link
            href="/mypage/orders"
            className="text-sm text-wabi-fg-muted underline-offset-4 transition-colors hover:text-wabi-fg hover:underline"
          >
            {more}개 더 보기 →
          </Link>
        )}
      </div>
      <p className="mt-2 text-sm text-wabi-fg-muted">
        별점과 짧은 한 줄이면 충분합니다. 같은 기물을 고르는 분들께 큰 도움이 됩니다.
      </p>
      <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border">
        {items.slice(0, SHOWN).map((it) => (
          <li key={it.productId} className="flex items-center gap-3.5 py-3.5">
            <Link
              href={`/shop/${it.productId}`}
              className="group flex min-w-0 flex-1 items-center gap-3.5 text-sm"
            >
              <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden bg-wabi-muted">
                {it.image ? (
                  <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <ImageIcon className="size-5 text-wabi-fg-muted/40" strokeWidth={1} aria-hidden />
                )}
              </span>
              <span className="min-w-0 truncate underline-offset-4 group-hover:underline">
                {it.name}
              </span>
            </Link>
            <ReviewLink productId={it.productId} productName={it.name} done={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
