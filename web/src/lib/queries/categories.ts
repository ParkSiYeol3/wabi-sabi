import { createPublicClient } from "@/lib/supabase/public";
import {
  categoryTree,
  type CategoryNode,
  type CategoryLeaf,
} from "@/lib/site";

// 카테고리 트리 — DB(categories)가 구조의 진실 (#246 이름 편집 → 0036 추가·숨김).
// 대표님이 어드민에서 분류를 추가/숨김/삭제할 수 있어 코드 고정 트리로는 못 담는다.
// 코드 categoryTree 는 DB 를 못 읽을 때의 폴백으로만 남긴다.
// 16~20행 작은 테이블이라 shop(이미 동적 렌더)에서 매 요청 조회해도 부하가 미미하고
// 편집이 캐시 지연 없이 즉시 반영된다.

type CategoryDbRow = {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  parent_id: string | null;
  is_active: boolean;
};

async function fetchRows(): Promise<CategoryDbRow[]> {
  // 푸터가 모든 페이지에 카테고리를 넣으면서 정적 프리렌더(예: /cart·/_not-found)
  // 에서도 이 조회가 돈다. 빌드 환경에 Supabase env 가 없으면 클라 생성이
  // throw 하므로, 그 경우엔 조용히 빈 배열 → 호출부가 코드 트리로 폴백한다.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  try {
    const db = createPublicClient();
    const { data } = await db
      .from("categories")
      .select("id, slug, name_ko, name_en, parent_id, is_active")
      .order("sort_order");
    return (data ?? []) as CategoryDbRow[];
  } catch (err) {
    console.error("[categories] fetch 실패", err);
    return [];
  }
}

// 공개 내비용 트리 — 숨김(is_active=false)은 제외. 숨긴 대분류의 하위도
// 함께 빠진다(부모에 붙지 못함). DB 가 비어 있으면 코드 트리 폴백.
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const rows = await fetchRows();
  if (!rows.length) return [...categoryTree];

  const active = rows.filter((r) => r.is_active);
  const leaf = (r: CategoryDbRow): CategoryLeaf => ({
    slug: r.slug,
    ko: r.name_ko,
    en: r.name_en,
  });

  return active
    .filter((r) => !r.parent_id)
    .map((parent) => {
      const kids = active.filter((r) => r.parent_id === parent.id);
      return kids.length
        ? { ...leaf(parent), children: kids.map(leaf) }
        : leaf(parent);
    });
}

// 필터용 slug 확장 — 대분류 slug 면 자신+하위 전부, 소분류/모르는 slug 는 자신만.
// (site.ts categorySlugs 의 DB 판 — 어드민 추가 분류도 확장되도록 DB 를 읽는다.
// 숨김 분류도 확장한다 — 내비에서만 빠질 뿐 직접 URL 필터는 계속 동작.)
export async function getCategorySlugs(slug: string): Promise<string[]> {
  const rows = await fetchRows();
  const me = rows.find((r) => r.slug === slug);
  if (!me) return [slug];
  const kids = rows.filter((r) => r.parent_id === me.id).map((r) => r.slug);
  return [slug, ...kids];
}
