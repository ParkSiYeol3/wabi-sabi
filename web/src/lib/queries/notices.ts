import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export interface NoticeSummary {
  id: string;
  title: string;
  created_at: string;
}

export interface Notice extends NoticeSummary {
  body: string;
}

// 공지는 전부 공개 데이터라 쿠키 없는 anon 클라 + unstable_cache 로 묶는다(홈·상세와 동일).
// 어드민 공지 생성/삭제 액션이 revalidatePath("/notice"[, `/notice/${id}`]) 로 무효화한다.

// 빌드 환경에 Supabase env 가 없으면(예: CI 프리렌더 /_not-found) createPublicClient
// 가 throw 하므로, 그 경우엔 조용히 빈 값 → 상단 공지 바는 렌더되지 않는다.
// (categories.fetchRows 와 동일 가드 — 루트 레이아웃에서 호출되면서 필요해졌다.)
function envReady(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// 공지 목록 (최신순).
async function loadNotices(): Promise<NoticeSummary[]> {
  if (!envReady()) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("notices")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .returns<NoticeSummary[]>();
  if (error || !data) return [];
  return data;
}

// tags: 어드민 생성/삭제가 revalidateTag("notices") 로 즉시 무효화한다.
// revalidatePath 는 unstable_cache 데이터 엔트리를 무효화하지 못해(경로 캐시만),
// 태그 없이는 최대 revalidate(120s) 동안 삭제·추가가 반영되지 않았다(대표님 제보).
// 이 조회는 루트 레이아웃(상단 공지 바)에서도 쓰여 모든 경로에 영향 → 태그 무효화로
// 한 번에 갱신한다.
export const getNotices = unstable_cache(loadNotices, ["notices-list"], {
  revalidate: 120,
  tags: ["notices"],
});

// 공지 단건 (없으면 null). id 가 캐시 키에 포함된다.
async function loadNotice(id: string): Promise<Notice | null> {
  if (!envReady()) return null;
  const db = createPublicClient();
  const { data, error } = await db
    .from("notices")
    .select("id, title, body, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Notice;
}

export const getNotice = unstable_cache(loadNotice, ["notice-detail"], {
  revalidate: 120,
  tags: ["notices"],
});
