import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  adminSetMomentHidden,
  adminDeleteMoment,
  adminSetCommentHidden,
  adminDeleteComment,
} from "./actions";

type Moment = {
  id: string;
  author_name: string;
  image_url: string;
  body: string | null;
  created_at: string;
  hidden: boolean;
};

type Comment = {
  id: string;
  moment_id: string;
  author_name: string;
  body: string;
  created_at: string;
  hidden: boolean;
};

// "오늘의 와비사비" 모더레이션 — 숨김/삭제. service_role 있으면 숨김 포함 전체.
export default async function AdminMomentsPage() {
  const db = adminConfigured() ? createAdminClient() : await createClient();
  const { data } = await db
    .from("wabi_moments")
    .select("id, author_name, image_url, body, created_at, hidden")
    .order("created_at", { ascending: false })
    .returns<Moment[]>();
  const moments = data ?? [];

  // 댓글 — 숨김 포함 최신순(service_role). 상세로 이동해 맥락 확인 가능.
  const { data: commentData } = await db
    .from("moment_comments")
    .select("id, moment_id, author_name, body, created_at, hidden")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Comment[]>();
  const comments = commentData ?? [];

  return (
    <>
      <PageHeader
        title="오늘의 와비사비"
        description="손님이 올린 사진·글을 숨기거나 삭제합니다."
      />

      {moments.length === 0 ? (
        <EmptyState>아직 올라온 게시물이 없습니다.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {moments.map((m) => (
            <li
              key={m.id}
              className="flex gap-4 border border-wabi-border bg-wabi-bg p-4"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded bg-wabi-muted">
                <Image
                  src={m.image_url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{m.author_name}</span>
                  <span className="text-xs text-wabi-fg-muted">
                    {new Date(m.created_at).toLocaleDateString("ko-KR")}
                  </span>
                  {m.hidden && (
                    <span className="rounded-full border border-amber-300 px-2 py-0.5 text-xs text-amber-800">
                      숨김
                    </span>
                  )}
                </div>
                {m.body && (
                  <p className="mt-1 text-sm text-wabi-fg-muted">{m.body}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <form action={adminSetMomentHidden}>
                  <input type="hidden" name="id" value={m.id} />
                  <input
                    type="hidden"
                    name="hidden"
                    value={m.hidden ? "false" : "true"}
                  />
                  <SubmitButton
                    pendingText="변경 중…"
                    className="cursor-pointer text-xs text-wabi-fg-muted underline transition-colors hover:text-wabi-fg"
                  >
                    {m.hidden ? "숨김 해제" : "숨기기"}
                  </SubmitButton>
                </form>
                <form action={adminDeleteMoment}>
                  <input type="hidden" name="id" value={m.id} />
                  <SubmitButton
                    pendingText="삭제 중…"
                    className="cursor-pointer text-xs text-red-700 underline transition-colors hover:text-red-800"
                  >
                    삭제
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 댓글 모더레이션 */}
      <section className="mt-12">
        <h2 className="text-lg font-medium text-wabi-fg">댓글</h2>
        <p className="mt-1 text-sm text-wabi-fg-muted">
          손님이 남긴 댓글을 숨기거나 삭제합니다. 숨긴 댓글은 상세에서 보이지 않습니다.
        </p>

        {comments.length === 0 ? (
          <EmptyState>아직 댓글이 없습니다.</EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{c.author_name}</span>
                    <span className="text-xs text-wabi-fg-muted">
                      {new Date(c.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    {c.hidden && (
                      <span className="rounded-full border border-amber-300 px-2 py-0.5 text-xs text-amber-800">
                        숨김
                      </span>
                    )}
                    <Link
                      href={`/today/${c.moment_id}`}
                      className="text-xs text-wabi-fg-muted underline underline-offset-2 hover:text-wabi-fg"
                    >
                      원문 보기
                    </Link>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-wabi-fg">
                    {c.body}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <form action={adminSetCommentHidden}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="moment_id" value={c.moment_id} />
                    <input
                      type="hidden"
                      name="hidden"
                      value={c.hidden ? "false" : "true"}
                    />
                    <SubmitButton
                      pendingText="변경 중…"
                      className="cursor-pointer text-xs text-wabi-fg-muted underline transition-colors hover:text-wabi-fg"
                    >
                      {c.hidden ? "숨김 해제" : "숨기기"}
                    </SubmitButton>
                  </form>
                  <form action={adminDeleteComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="moment_id" value={c.moment_id} />
                    <SubmitButton
                      pendingText="삭제 중…"
                      className="cursor-pointer text-xs text-red-700 underline transition-colors hover:text-red-800"
                    >
                      삭제
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
