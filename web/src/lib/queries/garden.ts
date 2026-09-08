import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { KST } from "@/lib/orders";

// 돌의 정원(枯山水) — 오늘 마당에 놓일 그릇을 날짜로 정한다 (#616, 대표님).
//
// 一期一会 — 오늘의 배치는 오늘만의 것이다. 날짜를 씨앗으로 쓰므로 같은 날 접속한
// 손님은 모두 같은 정원을 보고, 내일 오면 다른 그릇이 다른 자리에 놓인다. 저장할
// 상태가 없고(테이블·관리 화면 불필요) 서버·클라이언트가 같은 결과를 만든다.
//
// 날짜는 KST 로 끊는다 — 서버가 UTC 라 자정 기준이 어긋나면 한국 손님 기준으로
// 하루 늦게 바뀐다(주문 날짜 계산과 같은 이유, lib/orders.ts).

export type Stone = {
  id: string;
  name: string;
  image: string;
};

// 료안지의 돌은 열다섯. 그보다 많으면 마당이 붐벼 여백이 사라진다.
export const MAX_STONES = 15;

export function kstDateKey(now = new Date()): string {
  // en-CA 는 YYYY-MM-DD 형식을 준다 — 문자열 비교·씨앗으로 쓰기 좋다.
  return now.toLocaleDateString("en-CA", { timeZone: KST });
}

// 문자열 씨앗 → 결정적 난수. FNV-1a 로 섞고 xorshift 로 뽑는다. 암호용이 아니라
// "오늘은 이 배치" 를 서버·클라이언트가 똑같이 재현하기만 하면 된다.
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
}

// 씨앗을 공유하는 Fisher–Yates — 원본을 건드리지 않는다.
export function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function loadStones(dateKey: string): Promise<Stone[]> {
  const db = createPublicClient();
  // 재고·품절과 무관하게 고른다 — 정원은 파는 자리가 아니라 놓아둔 자리다.
  const { data, error } = await db
    .from("products")
    .select("id, name, images")
    .eq("is_active", true)
    .returns<{ id: string; name: string; images: unknown }[]>();
  if (error || !data) return [];

  const withImage = data.flatMap((p) => {
    const first =
      Array.isArray(p.images) && typeof p.images[0] === "string"
        ? p.images[0]
        : null;
    return first ? [{ id: p.id, name: p.name, image: first }] : [];
  });

  // id 로 먼저 정렬해 DB 반환 순서에 흔들리지 않게 한 뒤 날짜 씨앗으로 섞는다.
  withImage.sort((a, b) => a.id.localeCompare(b.id));
  return seededShuffle(withImage, seededRandom(`garden-${dateKey}`)).slice(
    0,
    MAX_STONES,
  );
}

// 하루 한 번만 바뀌므로 넉넉히 캐시한다. 날짜가 키에 들어가 자정이 지나면 자연히
// 새 항목이 된다(어드민 상품 변경 시엔 최대 1시간 늦게 반영 — 감상용이라 무해).
const getCachedStones = unstable_cache(
  (dateKey: string) => loadStones(dateKey),
  ["stone-garden"],
  { revalidate: 3600 },
);

export function getTodayStones(): Promise<Stone[]> {
  return getCachedStones(kstDateKey());
}
