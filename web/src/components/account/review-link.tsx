import Link from "next/link";
import { PenLine } from "lucide-react";

// 상품 리뷰 버튼(#765): 안 쓴 상품은 채운 버튼, 이미 쓴 상품은 외곽선 "리뷰 확인".
// 상품 상세의 리뷰 섹션으로 바로(#reviews, ScrollToHash 가 사이트 안 이동도 맞춘다).
// 주문 내역·주문 상세의 상품 줄마다 붙는다(#770, 주문 단위 버튼은 여러 상품이면
// 어느 상품인지 몰라 주문 상세로 보냈다).
// 스크린리더용 상품명(sr-only): 여러 상품 주문에서 "리뷰 쓰기"만 반복되면 구분이 안 된다.
export function ReviewLink({
  productId,
  productName,
  done,
}: {
  productId: string;
  productName: string;
  done: boolean;
}) {
  return (
    <Link
      href={`/shop/${productId}#reviews`}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
        done
          ? "border border-wabi-border text-wabi-fg hover:border-wabi-fg hover:bg-wabi-muted"
          : "border border-transparent bg-wabi-fg text-wabi-bg hover:bg-wabi-fg/85"
      }`}
    >
      <PenLine className="size-3.5" strokeWidth={1.8} aria-hidden />
      <span className="sr-only">{productName} </span>
      {done ? "리뷰 확인" : "리뷰 쓰기"}
    </Link>
  );
}

// 리뷰 버튼을 달 줄: 판매 중인 상품(products 조인이 null 이 아님)의 첫 줄만.
// 같은 상품이 옵션만 달리 여러 줄이면 버튼이 반복되지 않게 한다(리뷰는 상품 단위).
// items 는 화면에 그리는 순서 그대로 넘긴다.
export function reviewLines<
  T extends { product_id: string | null; products: unknown },
>(items: T[]): Set<T> {
  const seen = new Set<string>();
  const lines = new Set<T>();
  for (const it of items) {
    if (!it.product_id || !it.products || seen.has(it.product_id)) continue;
    seen.add(it.product_id);
    lines.add(it);
  }
  return lines;
}
