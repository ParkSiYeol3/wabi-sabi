import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, Panel } from "@/components/admin/ui";
import { CategoryRow } from "@/components/admin/category-row";

type Cat = {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  parent_id: string | null;
  sort_order: number;
};

// 카테고리 이름 편집 (#246) — slug·구조(트리)는 코드가 소유하고 이름만 바꾼다.
// 추가·삭제·순서 변경은 slug/URL/상품 연결 안정성을 위해 코드+마이그레이션으로.
export default async function AdminCategoriesPage() {
  const db = adminConfigured() ? createAdminClient() : await createClient();
  const { data } = await db
    .from("categories")
    .select("id, slug, name_ko, name_en, parent_id, sort_order")
    .order("sort_order")
    .returns<Cat[]>();

  const rows = data ?? [];
  const parents = rows.filter((c) => !c.parent_id);
  const childrenOf = (id: string) =>
    rows.filter((c) => c.parent_id === id);

  return (
    <>
      <PageHeader
        title="카테고리"
        description="분류 이름(한글·영문)을 편집합니다. 구조·순서는 고정입니다."
      />

      {rows.length === 0 ? (
        <p className="text-sm text-wabi-fg-muted">카테고리가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {parents.map((parent) => {
            const kids = childrenOf(parent.id);
            return (
              <Panel key={parent.id} className="p-5">
                <CategoryRow cat={parent} />
                {kids.length > 0 && (
                  <div className="mt-4 space-y-4 border-l border-wabi-border pl-4">
                    {kids.map((c) => (
                      <CategoryRow key={c.id} cat={c} child />
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
