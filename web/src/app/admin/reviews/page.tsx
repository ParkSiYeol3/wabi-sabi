import { Stars } from "@/components/stars";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { adminDeleteReview } from "./actions";

type Row = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
  products: { name: string } | null;
};

export default async function AdminReviewsPage() {
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const { data: reviews } = await db
    .from("reviews")
    .select("id, author_name, rating, body, created_at, products(name)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-medium">리뷰 목록 ({reviews?.length ?? 0})</h2>

      {!reviews?.length && (
        <p className="text-sm text-wabi-fg-muted">등록된 리뷰가 없습니다.</p>
      )}

      <ul className="space-y-5">
        {reviews?.map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-4 border border-wabi-border p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <Stars value={r.rating} size={14} />
                <span className="text-sm font-medium">{r.author_name}</span>
                {r.products?.name && (
                  <span className="text-xs text-wabi-fg-muted">
                    · {r.products.name}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-wabi-fg-muted">
                {r.body}
              </p>
              <time className="mt-1 block text-xs text-wabi-fg-muted">
                {new Date(r.created_at).toLocaleDateString("ko-KR")}
              </time>
            </div>
            <form action={adminDeleteReview}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="text-xs text-red-600 underline">
                삭제
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
