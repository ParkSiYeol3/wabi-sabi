// 남용 방지 rate limit (#16 / 보안_체크리스트).
// 백엔드 2단:
//  ① UPSTASH_REDIS_REST_URL·TOKEN 설정 시 → Redis INCR+EXPIRE (인스턴스 간 공유, 정확)
//  ② 미설정 시 → 인메모리 폴백 (서버리스 인스턴스별로 독립 = 상한이 인스턴스 수만큼
//     느슨해짐. 그래도 단일 클라이언트의 반복 폭주는 대부분 같은 인스턴스로 라우팅돼
//     실효가 있고, 무설정 배포에서도 무방비보다 낫다.)
// 결제·주문 생성은 별도 DB 가드(#53, checkout/actions)로 이미 보호됨.

type Result = { ok: boolean; remaining: number };

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function rateLimitBackend(): "redis" | "memory" {
  return REDIS_URL && REDIS_TOKEN ? "redis" : "memory";
}

// ── 인메모리 폴백 ──────────────────────────────────────────
// key → 만료 시각(ms) 기준 카운터. 요청 시 만료분을 정리해 무한 증식 방지.
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSec: number): Result {
  const now = Date.now();
  const entry = memory.get(key);

  if (!entry || entry.resetAt <= now) {
    // 새 창 시작 — 이 참에 만료된 키를 정리(요청당 최대 100개만 훑어 비용 상한)
    if (memory.size > 500) {
      let scanned = 0;
      for (const [k, v] of memory) {
        if (v.resetAt <= now) memory.delete(k);
        if (++scanned >= 100) break;
      }
    }
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1 };
  }

  entry.count += 1;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

// ── Upstash Redis (REST) ──────────────────────────────────
// SDK 없이 REST 파이프라인 1회 왕복: INCR 후 첫 요청이면 EXPIRE 로 창 설정.
async function redisLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<Result> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);

  const data = (await res.json()) as { result: unknown }[];
  const count = Number(data[0]?.result ?? 0);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

/**
 * 고정 창(fixed window) 카운터.
 * @param key 식별자 (예: `log-error:1.2.3.4`) — 호출부가 접두사로 용도를 구분한다.
 * @returns ok=false 면 호출부가 429 등으로 거절.
 *
 * Redis 실패 시 요청을 막지 않는다(fail-open) — 로깅·리포트 수집 같은 부가 기능이
 * 레이트리밋 인프라 장애로 함께 죽는 편이 더 나쁘다.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<Result> {
  if (rateLimitBackend() === "memory") return memoryLimit(key, limit, windowSec);
  try {
    return await redisLimit(key, limit, windowSec);
  } catch (err) {
    console.error("[rate-limit] Redis 실패 — 인메모리로 폴백", err);
    return memoryLimit(key, limit, windowSec);
  }
}

/**
 * 클라이언트 IP 추정 — Vercel 은 x-forwarded-for 최좌측에 실 클라이언트를 넣는다.
 * 신뢰 경계 밖 값이라 위조 가능(= IP 별 상한 우회 가능)하지만, 무인증 엔드포인트에서
 * 쓸 수 있는 유일한 키다. 인증 경로는 IP 대신 user.id 를 키로 쓸 것.
 */
export function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** 라우트 핸들러용 — 서버 액션에선 `clientIpFromHeaders(await headers())` 를 쓴다. */
export function clientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}
