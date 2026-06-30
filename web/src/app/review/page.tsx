import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Stars } from "@/components/stars";
import { getRecentReviews } from "@/lib/queries/reviews";

export const metadata: Metadata = {
  title: "리뷰",
  description: "WABI-SABI 고객 리뷰",
};

export default async function ReviewListPage() {
  const reviews = await getRecentReviews();

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">리뷰</h1>

      {reviews.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          아직 등록된 리뷰가 없습니다.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
          {reviews.map((r) => (
            <li key={r.id} className="py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} size={14} />
                  <span className="text-sm font-medium">{r.author_name}</span>
                </div>
                <time className="text-xs text-wabi-fg-muted">
                  {new Date(r.created_at).toLocaleDateString("ko-KR")}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-wabi-fg">
                {r.body}
              </p>
              {r.product_name && (
                <Link
                  href={`/shop/${r.product_id}`}
                  className="mt-2 inline-block text-xs text-wabi-fg-muted underline hover:text-wabi-fg"
                >
                  {r.product_name}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
