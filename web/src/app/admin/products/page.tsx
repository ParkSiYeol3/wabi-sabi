import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import {
  createProduct,
  updateStock,
  toggleActive,
  deleteProduct,
} from "./actions";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
};
type Category = { id: string; name_ko: string; name_en: string };

export default async function AdminProductsPage() {
  // service_role 있으면 전체(비활성 포함), 없으면 공개 읽기
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const { data: products } = await db
    .from("products")
    .select("id, name, price, stock, is_active")
    .order("created_at", { ascending: false })
    .returns<Product[]>();

  const { data: categories } = await db
    .from("categories")
    .select("id, name_ko, name_en")
    .order("sort_order")
    .returns<Category[]>();

  return (
    <div className="space-y-10">
      {/* 새 상품 */}
      <section>
        <h2 className="text-lg font-medium">새 상품 등록</h2>
        <form
          action={createProduct}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Input name="name" required placeholder="상품명" className="rounded-none" />
          <Input
            name="price"
            type="number"
            min={0}
            required
            placeholder="가격"
            className="rounded-none"
          />
          <Input
            name="stock"
            type="number"
            min={0}
            defaultValue={0}
            placeholder="재고"
            className="rounded-none"
          />
          <select
            name="category_id"
            className="border border-wabi-border bg-transparent px-3 text-sm"
          >
            <option value="">카테고리 없음</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ko} ({c.name_en})
              </option>
            ))}
          </select>
          <Button
            type="submit"
            className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 sm:col-span-2 lg:col-span-1"
          >
            등록
          </Button>
        </form>
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
                <th className="py-2">상품명</th>
                <th className="py-2">가격</th>
                <th className="py-2">재고</th>
                <th className="py-2">노출</th>
                <th className="py-2">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {products?.map((p) => (
                <tr key={p.id}>
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
                      <button type="submit" className="text-xs underline">
                        저장
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
                      <button type="submit" className="text-xs underline">
                        {p.is_active ? "노출중" : "숨김"}
                      </button>
                    </form>
                  </td>
                  <td className="py-3">
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-600 underline"
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
