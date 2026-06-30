import { createClient } from "@/lib/supabase/server";

export interface NoticeSummary {
  id: string;
  title: string;
  created_at: string;
}

export interface Notice extends NoticeSummary {
  body: string;
}

// 공지 목록 (최신순).
export async function getNotices(): Promise<NoticeSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .returns<NoticeSummary[]>();
  if (error || !data) return [];
  return data;
}

// 공지 단건 (없으면 null).
export async function getNotice(id: string): Promise<Notice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notices")
    .select("id, title, body, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Notice;
}
