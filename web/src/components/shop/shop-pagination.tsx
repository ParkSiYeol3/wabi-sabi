import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildShopQuery, type ShopSP } from "@/lib/shop-url";

// 상품 목록 페이지네이션(대표님 — < 1 2 3 … >). 현재 필터(카테고리·정렬·검색)를
// 그대로 두고 page 파라미터만 바꾼다. 목록은 캐시된 전체를 서버에서 슬라이스하므로
// 이 컴포넌트는 링크만 그린다(추가 쿼리 없음). 페이지가 많으면 앞뒤 창만 노출.
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

const arrowOff =
  "inline-flex size-9 items-center justify-center rounded-md border border-wabi-border/50 text-wabi-fg-muted/40";
const arrowOn =
  "inline-flex size-9 items-center justify-center rounded-md border border-wabi-border text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg";

export function ShopPagination({
  sp,
  page,
  totalPages,
}: {
  sp: ShopSP;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const items = pageWindow(page, totalPages);
  const linkFor = (n: number) => buildShopQuery(sp, { page: String(n) });

  return (
    <nav
      aria-label="페이지"
      className="mt-14 flex items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link href={linkFor(page - 1)} aria-label="이전 페이지" className={arrowOn}>
          <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
        </Link>
      ) : (
        <span className={arrowOff} aria-hidden>
          <ChevronLeft className="size-4" strokeWidth={1.8} />
        </span>
      )}

      {items.map((it, i) =>
        it === "…" ? (
          <span
            key={`e${i}`}
            className="px-1 text-sm text-wabi-fg-muted/60"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={linkFor(it)}
            aria-current={it === page ? "page" : undefined}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md border text-sm tabular-nums transition-colors",
              it === page
                ? "border-wabi-fg bg-wabi-fg text-white"
                : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg",
            )}
          >
            {it}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={linkFor(page + 1)} aria-label="다음 페이지" className={arrowOn}>
          <ChevronRight className="size-4" strokeWidth={1.8} aria-hidden />
        </Link>
      ) : (
        <span className={arrowOff} aria-hidden>
          <ChevronRight className="size-4" strokeWidth={1.8} />
        </span>
      )}
    </nav>
  );
}
