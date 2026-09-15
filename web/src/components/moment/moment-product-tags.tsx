import Image from "next/image";
import Link from "next/link";
import type { MomentProductTag } from "@/lib/queries/moments";

// 글에 쓰인 기물 태그(#664) — 누르면 상품 상세. 훅이 없어 목록(클라이언트 그리드)과
// 상세(서버 페이지) 양쪽에서 쓴다.
// compact: 목록 카드 — 좁은 2열에서도 한 줄로, 첫 태그 + "+N".
// full: 상세 — 전부, 작은 상품 사진과 함께.
export function MomentProductTags({
  products,
  variant,
}: {
  products: MomentProductTag[];
  variant: "compact" | "full";
}) {
  if (products.length === 0) return null;

  if (variant === "compact") {
    const [first, ...rest] = products;
    return (
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={`/shop/${first.id}`}
          className="min-w-0 truncate border border-wabi-border px-1.5 py-0.5 text-[11px] leading-4 text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
        >
          {first.name}
        </Link>
        {rest.length > 0 && (
          <span
            className="shrink-0 font-numeric text-[11px] text-wabi-fg-muted"
            aria-label={`외 ${rest.length}개 상품`}
          >
            +{rest.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xs text-wabi-fg-muted">사진 속 기물</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {products.map((p) => (
          <li key={p.id} className="max-w-full">
            <Link
              href={`/shop/${p.id}`}
              className="flex max-w-full items-center gap-2 border border-wabi-border py-1 pl-1 pr-3 text-sm text-wabi-fg transition-colors hover:border-wabi-fg"
            >
              <span className="relative size-8 shrink-0 overflow-hidden bg-wabi-muted">
                {p.image && (
                  <Image
                    src={p.image}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 truncate">{p.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
