import { createPublicClient } from "@/lib/supabase/public";
import {
  categoryTree,
  type CategoryNode,
  type CategoryLeaf,
} from "@/lib/site";

// 카테고리 트리 (#246, 대표님 이름 편집) — 구조·slug 는 코드(categoryTree)가
// 진실이고, 이름(ko/en)만 DB categories 에서 오버라이드한다. slug 는 URL·상품
// 연결에 묶여 불변이라 코드가 소유하고, 자주 바뀔 수 있는 이름만 편집 가능하게 한다.
// 16행 작은 테이블이라 shop(이미 동적 렌더)에서 매 요청 조회해도 부하가 미미하고
// 편집이 캐시 지연 없이 즉시 반영된다.
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const db = createPublicClient();
  const { data } = await db
    .from("categories")
    .select("slug, name_ko, name_en");

  const names = new Map<string, { ko: string; en: string }>();
  for (const r of (data ?? []) as {
    slug: string;
    name_ko: string;
    name_en: string;
  }[]) {
    names.set(r.slug, { ko: r.name_ko, en: r.name_en });
  }

  const apply = <T extends CategoryLeaf>(n: T): T => {
    const o = names.get(n.slug);
    return o ? { ...n, ko: o.ko, en: o.en } : n;
  };

  return categoryTree.map((node) => ({
    ...apply(node),
    ...(node.children ? { children: node.children.map(apply) } : {}),
  }));
}
