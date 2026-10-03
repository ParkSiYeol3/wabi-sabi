import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// 인스타그램 장기 토큰(#775). 60일 만료라 크론이 갱신해 DB(0073 instagram_token)에 둔다.
// 읽는 쪽(피드)은 getInstagramToken() 하나만 쓴다: DB 토큰 우선, 없거나 만료면 환경변수.
// 토큰을 새로 발급해 환경변수를 바꿨다면 instagram_token 행을 지워야 새 값이 쓰인다
// (DB 행이 살아 있으면 DB 가 이긴다). 다음 크론이 새 환경변수로 행을 다시 만든다.

export const INSTAGRAM_TOKEN_TAG = "instagram-token";

// 만료까지 이보다 적게 남으면 갱신한다. 크론이 매일 돌아서 실패해도 30번 더 기회가 있다.
const REFRESH_WITHIN_MS = 30 * 86_400_000;

type TokenRow = {
  access_token: string;
  expires_at: string | null;
  refreshed_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

async function readRow(): Promise<TokenRow | null> {
  if (!adminConfigured()) return null;
  const { data, error } = await createAdminClient()
    .from("instagram_token")
    .select("access_token, expires_at, refreshed_at, last_error, last_error_at")
    .maybeSingle<TokenRow>();
  // 마이그 전이면 테이블이 없다. 피드를 죽이지 않고 환경변수로 간다.
  if (error) return null;
  return data;
}

// 홈은 요청마다 렌더링되므로 토큰 조회는 1시간 캐시. 크론이 갱신하면 태그로 비운다.
const cachedToken = unstable_cache(
  async (): Promise<string | null> => {
    const row = await readRow();
    if (row && (!row.expires_at || Date.parse(row.expires_at) > Date.now())) {
      return row.access_token;
    }
    return process.env.INSTAGRAM_ACCESS_TOKEN || null;
  },
  ["instagram-token"],
  { revalidate: 3600, tags: [INSTAGRAM_TOKEN_TAG] },
);

export function getInstagramToken(): Promise<string | null> {
  return cachedToken();
}

export type RefreshResult =
  | { ok: true; refreshed: false; reason: string }
  | { ok: true; refreshed: true; expiresAt: string | null }
  | { ok: false; error: string };

// 크론에서 호출. 만료 30일 이내(또는 기한을 모름)일 때만 갱신한다.
// Instagram API with Instagram Login: GET graph.instagram.com/refresh_access_token
// (토큰이 24시간 이상 지났고 아직 유효해야 한다. 응답 = 새 토큰 + expires_in 초).
export async function refreshInstagramToken(): Promise<RefreshResult> {
  const db = createAdminClient();
  const row = await readRow();
  const current = row?.access_token || process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!current) return { ok: true, refreshed: false, reason: "no token" };

  if (row?.expires_at && Date.parse(row.expires_at) - Date.now() > REFRESH_WITHIN_MS) {
    return { ok: true, refreshed: false, reason: "not due" };
  }

  const fail = async (message: string): Promise<RefreshResult> => {
    // 행이 없으면 지금 토큰으로 만들어 실패를 남긴다(어드민 경고가 볼 수 있게).
    await db.from("instagram_token").upsert({
      id: true,
      access_token: current,
      last_error: message.slice(0, 300),
      last_error_at: new Date().toISOString(),
    });
    console.error(`[instagram] 토큰 갱신 실패: ${message}`);
    return { ok: false, error: message };
  };

  let json: { access_token?: string; expires_in?: number; error?: { message?: string } };
  try {
    const params = new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: current,
    });
    const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params}`, {
      cache: "no-store",
    });
    json = await res.json();
    if (!res.ok || !json.access_token) {
      return fail(`HTTP ${res.status} ${json.error?.message ?? ""}`.trim());
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : "network error");
  }

  const expiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null;
  const { error } = await db.from("instagram_token").upsert({
    id: true,
    access_token: json.access_token,
    expires_at: expiresAt,
    refreshed_at: new Date().toISOString(),
    last_error: null,
    last_error_at: null,
  });
  if (error) return fail(`저장 실패: ${error.message}`);

  revalidateTag(INSTAGRAM_TOKEN_TAG, "max");
  return { ok: true, refreshed: true, expiresAt };
}

// 어드민 대시보드 경고용 상태(토큰 값은 내보내지 않는다).
export type InstagramTokenStatus =
  | { kind: "ok" }
  | { kind: "failing"; since: string }
  | { kind: "expiring"; daysLeft: number };

export async function instagramTokenStatus(): Promise<InstagramTokenStatus> {
  const row = await readRow();
  if (!row) return { kind: "ok" };
  if (
    row.last_error_at &&
    (!row.refreshed_at || Date.parse(row.last_error_at) > Date.parse(row.refreshed_at))
  ) {
    return { kind: "failing", since: row.last_error_at };
  }
  if (row.expires_at) {
    const daysLeft = Math.floor((Date.parse(row.expires_at) - Date.now()) / 86_400_000);
    if (daysLeft <= 14) return { kind: "expiring", daysLeft };
  }
  return { kind: "ok" };
}
