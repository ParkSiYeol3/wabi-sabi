import { createClient } from "@/lib/supabase/server";

// 편집 가능한 사이트 콘텐츠 (#160) — 대표님이 어드민에서 고칠 수 있는 텍스트.
// 값이 없으면(미저장) 기본 문구로 폴백한다.

export const PHILOSOPHY_KEY = "philosophy";

// 철학 소개 기본 문구 — 문단은 빈 줄로 구분한다(렌더 시 <p> 로 분리).
export const DEFAULT_PHILOSOPHY = `わび-さび (Wabi-sabi)는 불완전함과 무상함의 아름다움을 받아들이는 일본의 미학입니다.

우리는 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를 큐레이션합니다. 각 제품은 장인의 손길이 닿은 유일무이한 작품입니다.

10년 넘게 오가바의 도자기로 만든 라면을 먹어온 우리가, 생각한 도자기를 만들어주었으면 하고 오가바 작가님께 주문을 했습니다. 주문하신 분들만이 가지실 수 있는 특별한 작품들입니다.`;

// key 에 해당하는 저장 값. 없거나 오류면 null(호출부에서 기본값 폴백).
export async function getSiteContent(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const value = data?.value?.trim();
  return value ? value : null;
}

// 빈 줄로 구분된 텍스트를 문단 배열로. 빈 문단은 제거.
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
