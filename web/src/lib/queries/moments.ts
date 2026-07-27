import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// "오늘의 와비사비" 게시판 조회 — 공감/댓글 집계를 함께 붙인다(0039).
// 집계는 세션 클라이언트로 세므로 RLS 적용(공감 select 는 공개, 댓글은 숨김 제외).
// UI 엔 총 개수 + 본인 공감 여부만 넘긴다.

// 한 페이지 카드 수(더보기 단위). 그리드 2·3·4열에 고르게 떨어지는 12.
export const MOMENTS_PAGE_SIZE = 12;

export interface MomentCard {
  id: string;
  author_name: string;
  image_url: string;
  body: string | null;
  created_at: string;
  user_id: string;
  like_count: number;
  comment_count: number;
  liked: boolean; // 현재 사용자가 공감했는지
}

export interface MomentComment {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

type MomentRow = Omit<MomentCard, "like_count" | "comment_count" | "liked">;

// 주어진 moment 행들에 공감 수·댓글 수·본인 공감 여부를 붙인다.
async function enrich(
  supabase: SupabaseClient,
  rows: MomentRow[],
  userId: string | undefined,
): Promise<MomentCard[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from("moment_likes").select("moment_id, user_id").in("moment_id", ids),
    // 숨김 제외(RLS 로도 걸러지나 명시적 이중 방어).
    supabase
      .from("moment_comments")
      .select("moment_id")
      .eq("hidden", false)
      .in("moment_id", ids),
  ]);

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of (likes as { moment_id: string; user_id: string }[]) ?? []) {
    likeCount.set(l.moment_id, (likeCount.get(l.moment_id) ?? 0) + 1);
    if (userId && l.user_id === userId) likedByMe.add(l.moment_id);
  }
  const commentCount = new Map<string, number>();
  for (const c of (comments as { moment_id: string }[]) ?? [])
    commentCount.set(c.moment_id, (commentCount.get(c.moment_id) ?? 0) + 1);

  return rows.map((r) => ({
    ...r,
    like_count: likeCount.get(r.id) ?? 0,
    comment_count: commentCount.get(r.id) ?? 0,
    liked: likedByMe.has(r.id),
  }));
}

// 목록 한 페이지 — 최신순. hasMore 판정 위해 limit+1 을 조회하고 잘라 반환한다.
export async function getMomentsPage(
  offset: number,
  limit: number,
): Promise<{ moments: MomentCard[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("wabi_moments")
    .select("id, author_name, image_url, body, created_at, user_id")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit) // limit+1 개
    .returns<MomentRow[]>();
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const visible = hasMore ? rows.slice(0, limit) : rows;

  return { moments: await enrich(supabase, visible, user?.id), hasMore };
}

// 상세 1건 — 없으면 null(숨김·삭제 포함, RLS public read 로 숨김은 안 옴).
export async function getMoment(id: string): Promise<MomentCard | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("wabi_moments")
    .select("id, author_name, image_url, body, created_at, user_id")
    .eq("id", id)
    .maybeSingle<MomentRow>();
  if (!data) return null;

  const [card] = await enrich(supabase, [data], user?.id);
  return card ?? null;
}

// 상세의 댓글 — 오래된 순(대화 흐름). RLS 로 숨김 제외.
export async function getMomentComments(
  momentId: string,
): Promise<MomentComment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("moment_comments")
    .select("id, user_id, author_name, body, created_at")
    .eq("moment_id", momentId)
    .eq("hidden", false)
    .order("created_at", { ascending: true })
    .returns<MomentComment[]>();
  return data ?? [];
}
