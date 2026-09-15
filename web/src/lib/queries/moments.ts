import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// "오늘의 와비사비" 게시판 조회 — 공감/댓글 집계를 함께 붙인다(0039).
// 집계는 세션 클라이언트로 세므로 RLS 적용(공감 select 는 공개, 댓글은 숨김 제외).
// UI 엔 총 개수 + 본인 공감 여부만 넘긴다.

// 한 페이지 카드 수(더보기 단위). 그리드 2·3·4열에 고르게 떨어지는 12.
export const MOMENTS_PAGE_SIZE = 12;

// 글에 태그된 기물(#664, 0062). 판매중(is_active) 상품만 — 내린 상품 태그는 숨긴다.
export interface MomentProductTag {
  id: string;
  name: string;
  image: string | null; // 대표 사진(첫 장)
}

export interface MomentCard {
  id: string;
  author_name: string;
  image_url: string; // 커버(첫 장) — 그리드 썸네일·OG 호환용
  image_urls: string[] | null; // 전체 사진(다중, 0051). 구 데이터는 null → [image_url] 폴백
  body: string | null;
  created_at: string;
  user_id: string;
  like_count: number;
  comment_count: number;
  liked: boolean; // 현재 사용자가 공감했는지
  products: MomentProductTag[]; // 태그된 기물(고른 순서)
}

export interface MomentComment {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

type MomentRow = Omit<
  MomentCard,
  "like_count" | "comment_count" | "liked" | "products"
> & { product_ids: string[] | null };

const MOMENT_COLUMNS =
  "id, author_name, image_url, image_urls, body, created_at, user_id, product_ids";

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

// id 목록 → 판매중 상품 태그 맵. 없는 id(삭제·비활성)는 맵에 없으므로 자연히 빠진다.
async function productTagMap(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, MomentProductTag>> {
  const map = new Map<string, MomentProductTag>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("products")
    .select("id, name, images")
    .eq("is_active", true)
    .in("id", ids);
  for (const p of (data as { id: string; name: string; images: unknown }[]) ??
    [])
    map.set(p.id, { id: p.id, name: p.name, image: firstImage(p.images) });
  return map;
}

// 주어진 moment 행들에 공감 수·댓글 수·본인 공감 여부·기물 태그를 붙인다.
async function enrich(
  supabase: SupabaseClient,
  rows: MomentRow[],
  userId: string | undefined,
): Promise<MomentCard[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const productIds = [...new Set(rows.flatMap((r) => r.product_ids ?? []))];

  const [{ data: likes }, { data: comments }, tags] = await Promise.all([
    supabase.from("moment_likes").select("moment_id, user_id").in("moment_id", ids),
    // 숨김 제외(RLS 로도 걸러지나 명시적 이중 방어).
    supabase
      .from("moment_comments")
      .select("moment_id")
      .eq("hidden", false)
      .in("moment_id", ids),
    productTagMap(supabase, productIds),
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

  return rows.map(({ product_ids: tagged, ...r }) => ({
    ...r,
    like_count: likeCount.get(r.id) ?? 0,
    comment_count: commentCount.get(r.id) ?? 0,
    liked: likedByMe.has(r.id),
    products: (tagged ?? [])
      .map((pid) => tags.get(pid))
      .filter((t): t is MomentProductTag => !!t),
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
    .select(MOMENT_COLUMNS)
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
    .select(MOMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle<MomentRow>();
  if (!data) return null;

  const [card] = await enrich(supabase, [data], user?.id);
  return card ?? null;
}

// 태그로 고를 수 있는 기물 — 판매중 상품 전부, 최신순(shop 기본 정렬과 같게).
// 작성 폼·어드민 태그 편집이 쓴다.
export async function getTaggableProducts(): Promise<MomentProductTag[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, images")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return ((data as { id: string; name: string; images: unknown }[]) ?? []).map(
    (p) => ({ id: p.id, name: p.name, image: firstImage(p.images) }),
  );
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
