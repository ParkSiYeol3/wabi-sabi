import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import { isLowStock } from "@/lib/inventory";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { ProductImageAdder } from "@/components/admin/product-image-adder";
import {
  updateStock,
  toggleActive,
  toggleMonthly,
  deleteProduct,
  removeProductImage,
} from "./actions";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  is_monthly: boolean;
  images: string[] | null;
};
type Category = { id: string; name_ko: string; name_en: string };
type CategoryRow = Category & { parent_id: string | null };

export default async function AdminProductsPage() {
  // service_role 있으면 전체(비활성 포함), 없으면 공개 읽기
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const { data: products } = await db
    .from("products")
    .select("id, name, price, stock, is_active, is_monthly, images")
    .order("created_at", { ascending: false })
    .returns<Product[]>();

  const { data: categoryRows } = await db
    .from("categories")
    .select("id, name_ko, name_en, parent_id")
    .order("sort_order")
    .returns<CategoryRow[]>();

  // 상품은 소분류(잎)에만 연결한다(#193 2계층). 하위가 있는 대분류는 선택지에서
  // 빼고, 소분류는 "대분류 > 소분류" 라벨로 어디 속하는지 보이게 한다.
  // 하위 없는 대분류('선물')는 그대로 잎이다.
  const rows = categoryRows ?? [];
  const parentIds = new Set(rows.map((c) => c.parent_id).filter(Boolean));
  const nameById = new Map(rows.map((c) => [c.id, c.name_ko]));
  const categories: Category[] = rows
    .filter((c) => !parentIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name_ko: c.parent_id
        ? `${nameById.get(c.parent_id)} > ${c.name_ko}`
        : c.name_ko,
      name_en: c.name_en,
    }));

  return (
    <div className="space-y-10">
      {/* 새 상품 — 클라이언트 폼: 실패 시 입력값 유지 + 결과 메시지 */}
      <section>
        <h2 className="text-lg font-medium">새 상품 등록</h2>
        <ProductCreateForm categories={categories ?? []} />
      </section>

      {/* 목록 */}
      <section>
        <h2 className="text-lg font-medium">
          상품 목록 ({products?.length ?? 0})
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-150 text-sm">
            <thead className="border-b border-wabi-border text-left text-xs text-wabi-fg-muted">
              <tr>
                <th className="py-2">이미지</th>
                <th className="py-2">상품명</th>
                <th className="py-2">가격</th>
                <th className="py-2">재고</th>
                <th className="py-2">이 달의 상품</th>
                <th className="py-2">노출</th>
                <th className="py-2">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {products?.map((p) => (
                <tr key={p.id}>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {(p.images ?? []).map((url) => (
                        <span key={url} className="relative">
                          <Image
                            src={url}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="size-10 rounded object-cover"
                          />
                          <form action={removeProductImage}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="url" value={url} />
                            <button
                              type="submit"
                              aria-label="이미지 삭제"
                              className="absolute -right-1 -top-1 flex size-4 cursor-pointer items-center justify-center rounded-full bg-red-600 text-[10px] leading-none text-white transition-colors hover:bg-red-700"
                            >
                              ×
                            </button>
                          </form>
                        </span>
                      ))}
                      <ProductImageAdder productId={p.id} />
                    </div>
                  </td>
                  <td className="py-3">{p.name}</td>
                  <td className="py-3">{won(p.price)}</td>
                  <td className="py-3">
                    <form action={updateStock} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="stock"
                        type="number"
                        min={0}
                        defaultValue={p.stock}
                        className="w-16 border border-wabi-border bg-transparent px-2 py-1"
                      />
                      <button type="submit" className="cursor-pointer text-xs underline transition-colors hover:text-wabi-accent">
                        저장
                      </button>
                      {p.stock === 0 ? (
                        <span className="ml-1 whitespace-nowrap border border-red-300 px-1.5 py-0.5 text-xs text-red-700">
                          품절
                        </span>
                      ) : isLowStock(p.stock) ? (
                        <span className="ml-1 whitespace-nowrap border border-amber-300 px-1.5 py-0.5 text-xs text-amber-800">
                          부족
                        </span>
                      ) : null}
                    </form>
                  </td>
                  <td className="py-3">
                    <form action={toggleMonthly}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="is_monthly"
                        value={String(p.is_monthly)}
                      />
                      <button type="submit" className="cursor-pointer text-xs underline transition-colors hover:text-wabi-accent">
                        {p.is_monthly ? "지정됨" : "지정"}
                      </button>
                    </form>
                  </td>
                  <td className="py-3">
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={String(p.is_active)}
                      />
                      <button type="submit" className="cursor-pointer text-xs underline transition-colors hover:text-wabi-accent">
                        {p.is_active ? "노출중" : "숨김"}
                      </button>
                    </form>
                  </td>
                  <td className="py-3">
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="cursor-pointer text-xs text-red-700 underline transition-colors hover:text-red-800"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
