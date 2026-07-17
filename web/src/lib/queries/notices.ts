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

// 공지 목록 (최신순).
async function loadNotices(): Promise<NoticeSummary[]> {
  const db = createPublicClient();
  const { data, error } = await db
    .from("notices")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .returns<NoticeSummary[]>();
  if (error || !data) return [];
  return data;
}

export const getNotices = unstable_cache(loadNotices, ["notices-list"], {
  revalidate: 120,
});

// 공지 단건 (없으면 null). id 가 캐시 키에 포함된다.
async function loadNotice(id: string): Promise<Notice | null> {
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
});
