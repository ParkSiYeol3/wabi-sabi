import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { MomentLikeButton } from "@/components/moment/moment-like-button";
import { MomentCarousel } from "@/components/moment/moment-carousel";
import { MomentCommentForm } from "@/components/moment/moment-comment-form";
import { MomentShareButton } from "@/components/moment/moment-share-button";
import { SubmitButton } from "@/components/common/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getMoment, getMomentComments } from "@/lib/queries/moments";
import { deleteMoment, deleteComment } from "../actions";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const m = await getMoment(id);
  if (!m) return { title: "오늘의 와비사비" };
  const title = m.body ? m.body.slice(0, 30) : `${m.author_name}의 순간`;
  return {
    title,
    description: m.body ?? "오늘의 와비사비 — 손님들의 일상 속 그릇 이야기.",
    openGraph: { images: m.image_urls?.length ? m.image_urls : [m.image_url] },
  };
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default async function MomentDetailPage({ params }: Params) {
  const { id } = await params;
  const [moment, comments] = await Promise.all([
    getMoment(id),
    getMomentComments(id),
  ]);
  if (!moment) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const backHref = `/today/${moment.id}`;

  return (
    <Container className="py-12">
      <Link
        href="/today"
        className="inline-flex items-center gap-1 text-sm text-wabi-fg-muted transition-colors hover:text-wabi-fg"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} />
        오늘의 와비사비
      </Link>

      <article className="mt-6 grid gap-8 md:grid-cols-2">
        <MomentCarousel
          images={
            moment.image_urls?.length ? moment.image_urls : [moment.image_url]
          }
          alt={
            moment.body ? moment.body.slice(0, 60) : `${moment.author_name}의 순간`
          }
        />

        <div className="flex flex-col">
          <div className="flex items-center justify-between text-sm text-wabi-fg-muted">
            <span className="font-medium text-wabi-fg">{moment.author_name}</span>
            <time className="font-numeric">{fmtDate(moment.created_at)}</time>
          </div>

          {moment.body && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-wabi-fg">
              {moment.body}
            </p>
          )}

          <div className="mt-6 flex items-center gap-4">
            <MomentLikeButton
              momentId={moment.id}
              initialLiked={moment.liked}
              initialCount={moment.like_count}
              size="lg"
            />
            <MomentShareButton
              title={
                moment.body
                  ? moment.body.slice(0, 40)
                  : `${moment.author_name}의 오늘의 와비사비`
              }
            />
          </div>

          {user?.id === moment.user_id && (
            <form action={deleteMoment} className="mt-6">
              <input type="hidden" name="id" value={moment.id} />
              <input type="hidden" name="redirect" value="/today" />
              <SubmitButton
                pendingText="삭제 중…"
                className="cursor-pointer text-sm text-red-700 underline-offset-2 hover:underline"
              >
                이 글 삭제
              </SubmitButton>
            </form>
          )}
        </div>
      </article>

      {/* 댓글 */}
      <section className="mt-12 border-t border-wabi-border pt-8">
        <h2 className="text-sm font-medium">
          댓글 <span className="font-numeric">{comments.length}</span>
        </h2>

        <ul className="mt-4 space-y-4">
          {comments.length === 0 ? (
            <li className="text-sm text-wabi-fg-muted">
              첫 댓글을 남겨보세요.
            </li>
          ) : (
            comments.map((c) => (
              <li key={c.id} className="text-sm">
                <div className="flex items-center justify-between text-xs text-wabi-fg-muted">
                  <span className="font-medium text-wabi-fg">
                    {c.author_name}
                  </span>
                  <span className="flex items-center gap-2">
                    <time className="font-numeric">{fmtDate(c.created_at)}</time>
                    {user?.id === c.user_id && (
                      <form action={deleteComment}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="moment_id" value={moment.id} />
                        <SubmitButton
                          pendingText="삭제 중…"
                          className="cursor-pointer text-red-700 underline-offset-2 hover:underline"
                        >
                          삭제
                        </SubmitButton>
                      </form>
                    )}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-6 text-wabi-fg">
                  {c.body}
                </p>
              </li>
            ))
          )}
        </ul>

        <div className="mt-6">
          {user ? (
            <MomentCommentForm momentId={moment.id} />
          ) : (
            <p className="border border-wabi-border bg-wabi-subtle/40 px-4 py-3 text-sm text-wabi-fg-muted">
              <Link
                href={`/auth?redirect=${encodeURIComponent(backHref)}`}
                className="font-medium text-wabi-fg underline underline-offset-2"
              >
                로그인
              </Link>{" "}
              후 댓글을 남길 수 있습니다.
            </p>
          )}
        </div>
      </section>
    </Container>
  );
}
