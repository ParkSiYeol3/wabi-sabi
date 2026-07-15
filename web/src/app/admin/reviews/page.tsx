import { Stars } from "@/components/stars";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { adminDeleteReview, adminSetReviewHidden } from "./actions";

type Row = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
  hidden: boolean;
  products: { name: string } | null;
};

type ReportRow = {
  review_id: string;
  reason: string;
  created_at: string;
};

type ReportInfo = { count: number; reasons: string[] };

export default async function AdminReviewsPage() {
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const [{ data: reviews }, { data: reports }] = await Promise.all([
    db
      .from("reviews")
      .select("id, author_name, rating, body, created_at, hidden, products(name)")
      .order("created_at", { ascending: false })
      .returns<Row[]>(),
    db
      .from("review_reports")
      .select("review_id, reason, created_at")
      .order("created_at", { ascending: false })
      .returns<ReportRow[]>(),
  ]);

  // 신고를 리뷰별로 묶는다. 최신 사유 몇 개만 노출.
  const reportsByReview = new Map<string, ReportInfo>();
  for (const rep of reports ?? []) {
    const info = reportsByReview.get(rep.review_id) ?? { count: 0, reasons: [] };
    info.count += 1;
    if (info.reasons.length < 5) info.reasons.push(rep.reason);
    reportsByReview.set(rep.review_id, info);
  }

  // 신고된 리뷰를 위로(신고 수 내림차순), 그다음 최신순.
  const sorted = [...(reviews ?? [])].sort((a, b) => {
    const ca = reportsByReview.get(a.id)?.count ?? 0;
    const cb = reportsByReview.get(b.id)?.count ?? 0;
    if (ca !== cb) return cb - ca;
    return b.created_at.localeCompare(a.created_at);
  });

  const reportedCount = reportsByReview.size;

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-medium">
        리뷰 목록 ({sorted.length})
        {reportedCount > 0 && (
          <span className="ml-2 text-sm text-red-600">
            · 신고 {reportedCount}건
          </span>
        )}
      </h2>

      {!sorted.length && (
        <p className="text-sm text-wabi-fg-muted">등록된 리뷰가 없습니다.</p>
      )}

      <ul className="space-y-5">
        {sorted.map((r) => {
          const report = reportsByReview.get(r.id);
          return (
            <li
              key={r.id}
              className={`flex items-start justify-between gap-4 border p-4 ${
                r.hidden
                  ? "border-wabi-border bg-wabi-subtle"
                  : report
                    ? "border-red-300"
                    : "border-wabi-border"
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} size={14} />
                  <span className="text-sm font-medium">{r.author_name}</span>
                  {r.products?.name && (
                    <span className="text-xs text-wabi-fg-muted">
                      · {r.products.name}
                    </span>
                  )}
                  {r.hidden && (
                    <span className="border border-wabi-border px-1.5 py-0.5 text-xs text-wabi-fg-muted">
                      숨김
                    </span>
                  )}
                  {report && (
                    <span className="bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
                      신고 {report.count}
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-wabi-fg-muted">
                  {r.body}
                </p>
                {report && (
                  <p className="mt-1 text-xs text-red-600">
                    사유: {report.reasons.join(", ")}
                    {report.count > report.reasons.length && " …"}
                  </p>
                )}
                <time className="mt-1 block text-xs text-wabi-fg-muted">
                  {new Date(r.created_at).toLocaleDateString("ko-KR")}
                </time>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <form action={adminSetReviewHidden}>
                  <input type="hidden" name="id" value={r.id} />
                  <input
                    type="hidden"
                    name="hidden"
                    value={r.hidden ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="cursor-pointer text-xs text-wabi-fg-muted underline transition-colors hover:text-wabi-fg"
                  >
                    {r.hidden ? "숨김 해제" : "숨기기"}
                  </button>
                </form>
                <form action={adminDeleteReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="cursor-pointer text-xs text-red-600 underline transition-colors hover:text-red-700"
                  >
                    삭제
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
