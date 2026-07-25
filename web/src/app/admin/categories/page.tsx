import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { PageHeader, Panel, SectionHeading } from "@/components/admin/ui";
import { CategoryRow } from "@/components/admin/category-row";
import { CategoryAddForm } from "@/components/admin/category-add-form";
import { CategoryTools } from "@/components/admin/category-tools";

type Cat = {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

// 카테고리 관리 — 이름 편집(#246) + 추가·숨김·삭제(0036, 대표님 지시).
// 숨김은 shop 내비에서만 빠지고 상품 연결은 보존. 삭제는 빈 분류만.
export default async function AdminCategoriesPage() {
  const db = adminConfigured() ? createAdminClient() : await createClient();
  const [{ data }, { data: productRows }] = await Promise.all([
    db
      .from("categories")
      .select("id, slug, name_ko, name_en, parent_id, sort_order, is_active")
      .order("sort_order")
      .returns<Cat[]>(),
    db.from("products").select("category_id"),
  ]);

  const rows = data ?? [];
  const parents = rows.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => rows.filter((c) => c.parent_id === id);

  // 분류별 연결 상품 수 — 삭제 가능 여부(빈 분류) 판단 + 대표님 참고 표시.
  const productCount = new Map<string, number>();
  for (const p of (productRows ?? []) as { category_id: string | null }[]) {
    if (p.category_id)
      productCount.set(p.category_id, (productCount.get(p.category_id) ?? 0) + 1);
  }

  const tools = (c: Cat) => (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-wabi-fg-muted">
        상품 {productCount.get(c.id) ?? 0}개
      </span>
      {!c.is_active && (
        <span className="rounded-full border border-amber-300 px-2 py-0.5 text-xs text-amber-800">
          숨김 상태
        </span>
      )}
      <CategoryTools
        id={c.id}
        isActive={c.is_active}
        deletable={
          childrenOf(c.id).length === 0 && !(productCount.get(c.id) ?? 0)
        }
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="카테고리"
        description="분류 이름 편집·추가·숨김·삭제. 숨기면 shop 메뉴에서만 빠지고 상품 연결은 유지됩니다."
      />

      <div className="space-y-8">
        <section>
          <SectionHeading>새 분류 추가</SectionHeading>
          <div className="mt-3">
            <CategoryAddForm
              parents={parents.map((p) => ({ id: p.id, name_ko: p.name_ko }))}
            />
          </div>
        </section>

        {rows.length === 0 ? (
          <p className="text-sm text-wabi-fg-muted">카테고리가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {parents.map((parent) => {
              const kids = childrenOf(parent.id);
              return (
                <Panel key={parent.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CategoryRow cat={parent} />
                    {tools(parent)}
                  </div>
                  {kids.length > 0 && (
                    <div className="mt-4 space-y-4 border-l border-wabi-border pl-4">
                      {kids.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-3"
                        >
                          <CategoryRow cat={c} child />
                          {tools(c)}
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
