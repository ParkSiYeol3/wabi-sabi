// WSB-020~022: 인스타그램 피드 — IG Graph API 서버 fetch.
// INSTAGRAM_ACCESS_TOKEN(장기 토큰, 60일 만료) 미설정·호출 실패 시 null 반환
// → 컴포넌트가 기존 플레이스홀더 그리드로 폴백하므로 페이지는 항상 정상 렌더.
// 토큰 발급: Meta 개발자 앱 > Instagram API > 장기 액세스 토큰 (env.example 참고)

export type InstagramPost = {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption: string | null;
};

type ApiMedia = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
};

const FIELDS = "id,media_type,media_url,thumbnail_url,permalink,caption";

export async function fetchInstagramPosts(
  limit = 6,
): Promise<InstagramPost[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const params = new URLSearchParams({
      fields: FIELDS,
      // VIDEO 는 thumbnail_url 사용을 위해 여유분 포함 없이 limit 그대로 요청
      // (미디어 누락 시 그리드가 6개 미만이어도 UI 상 문제 없음)
      limit: String(limit),
      access_token: token,
    });
    const res = await fetch(
      `https://graph.instagram.com/me/media?${params}`,
      // 1시간 ISR — 피드 갱신 빈도 대비 충분, API 쿼터 절약
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      console.error(`[instagram] API ${res.status} ${res.statusText}`);
      return null;
    }
    const json = (await res.json()) as { data?: ApiMedia[] };
    const posts = (json.data ?? [])
      .map((m) => ({
        id: m.id,
        mediaUrl: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url,
        permalink: m.permalink,
        caption: m.caption ?? null,
      }))
      .filter((p): p is InstagramPost => Boolean(p.mediaUrl))
      .slice(0, limit);
    return posts.length > 0 ? posts : null;
  } catch (err) {
    console.error("[instagram] fetch 실패", err);
    return null;
  }
}
