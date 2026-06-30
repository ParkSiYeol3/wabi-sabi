import { createClient } from "@/lib/supabase/server";

export interface InquirySummary {
  id: string;
  title: string;
  is_secret: boolean;
  answered: boolean;
  created_at: string;
}

export interface InquiryDetail {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_secret: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

type ListRow = {
  id: string;
  title: string;
  is_secret: boolean;
  answer: string | null;
  created_at: string;
};

// 문의 목록 — RLS가 공개글 + 본인 비밀글만 반환.
export async function getInquiries(): Promise<InquirySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, title, is_secret, answer, created_at")
    .order("created_at", { ascending: false })
    .returns<ListRow[]>();
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    is_secret: r.is_secret,
    answered: r.answer !== null,
    created_at: r.created_at,
  }));
}

// 문의 단건 — RLS 위반(타인 비밀글)이면 null.
export async function getInquiry(id: string): Promise<InquiryDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, user_id, title, body, is_secret, answer, answered_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as InquiryDetail;
}
