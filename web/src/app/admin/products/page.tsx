import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { won } from "@/lib/orders";
import { isLowStock } from "@/lib/inventory";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { ProductImageAdder } from "@/components/admin/product-image-adder";
import {
  PageHeader,
  SectionHeading,
  TablePanel,
  EmptyState,
  adminAction,
} from "@/components/admin/ui";
import { SubmitButton } from "@/components/common/submit-button";
import {
  updateStock,
  toggleActive,
  toggleMonthly,
  deleteProduct,
  removeProductImage,
  moveProductImage,
} from "./actions";

import { leafCategoryOptions, type CategoryRow } from "./leaf-options";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  is_monthly: boolean;
  images: string[] | null;
};

export default async function AdminProductsPage() {
  // service_role 있으면 전체(비활성 포함), 없으면 공개 읽기
  const db = adminConfigured() ? createAdminClient() : await createClient();

  const { data: products } = await db
    .from("products")
    .select("id, name, price, stock, is_active, is_monthly, images")
    .order("created_at", { ascending: false })
    .returns<Product[]>();

  // 숨김 분류(0036)는 새 상품 연결 선택지에서 제외.
  const { data: categoryRows } = await db
    .from("categories")
    .select("id, name_ko, name_en, parent_id")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();

  // 잎 카테고리 선택지 — 수정 페이지와 공용(leaf-options.ts)
  const categories = leafCategoryOptions(categoryRows ?? []);

  return (
    <>
      <PageHeader title="상품 관리" description="상품 등록·재고·노출·삭제." />

      <div className="space-y-10">
        {/* 새 상품 — 클라이언트 폼: 실패 시 입력값 유지 + 결과 메시지 */}
        <section>
          <SectionHeading>새 상품 등록</SectionHeading>
          <ProductCreateForm categories={categories ?? []} />
        </section>

        {/* 목록 */}
        <section>
          <SectionHeading>상품 목록 ({products?.length ?? 0})</SectionHeading>
          {/* 이미지 순서 안내(대표님) — 상세 페이지 사진 배치가 이 순서로 결정됨 */}
          <p className="mt-1 text-xs leading-relaxed text-wabi-fg-muted">
            사진 순서가 상세 페이지 배치를 정합니다. <b>대표</b>(첫 장)는 상단 큰
            사진, <b>상세1·2·3…</b>은 아래로 내려가며 정해진 불규칙 위치에 순서대로
            놓입니다. ◀▶ 로 순서를 바꿔 원하는 자리에 배치하세요.
          </p>
          {!products?.length ? (
            <div className="mt-3">
              <EmptyState>등록된 상품이 없습니다.</EmptyState>
            </div>
          ) : (
            <div className="mt-3">
              <TablePanel>
                <table className="w-full min-w-150 text-sm">
                  <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">이미지</th>
                      <th className="px-4 py-3 font-medium">상품명</th>
                      <th className="px-4 py-3 font-medium">가격</th>
                      <th className="px-4 py-3 font-medium">재고</th>
                      <th className="px-4 py-3 font-medium">이 달의 상품</th>
                      <th className="px-4 py-3 font-medium">노출</th>
                      <th className="px-4 py-3 font-medium">수정</th>
                      <th className="px-4 py-3 font-medium">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wabi-border">
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        className="transition-colors hover:bg-wabi-muted/40"
                      >
                        <td className="px-4 py-3">
                    <div className="flex flex-wrap items-start gap-2">
                      {(p.images ?? []).map((url, i, arr) => (
                        <div
                          key={url}
                          className="flex flex-col items-center gap-0.5"
                        >
                          <span className="relative">
                            <Image
                              src={url}
                              alt={p.name}
                              width={40}
                              height={40}
                              className="size-10 rounded object-cover"
                            />
                            {/* 위치 배지 — 첫 장=대표(히어로), 이후=상세 스캐터 순서 */}
                            <span className="absolute -left-1 -top-1 rounded bg-wabi-fg px-1 text-[9px] font-medium leading-tight text-white">
                              {i === 0 ? "대표" : `상세${i}`}
                            </span>
                            <form action={removeProductImage}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="url" value={url} />
                              <SubmitButton
                                pendingText="…"
                                aria-label="이미지 삭제"
                                className="absolute -right-1 -top-1 flex size-4 cursor-pointer items-center justify-center rounded-full bg-red-600 text-[10px] leading-none text-white transition-colors hover:bg-red-700"
                              >
                                ×
                              </SubmitButton>
                            </form>
                          </span>
                          {/* 순서 이동 — 상세 스캐터 위치가 이 순서로 결정됨.
                              끝단에서는 해당 방향 버튼을 숨긴다. */}
                          <div className="flex gap-0.5">
                            {i > 0 && (
                              <form action={moveProductImage}>
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="from" value={i} />
                                <input type="hidden" name="dir" value="left" />
                                <SubmitButton
                                  pendingText="…"
                                  aria-label="앞으로 이동"
                                  className="flex size-4 cursor-pointer items-center justify-center rounded border border-wabi-border text-[10px] leading-none text-wabi-fg transition-colors hover:bg-wabi-muted"
                                >
                                  ◀
                                </SubmitButton>
                              </form>
                            )}
                            {i < arr.length - 1 && (
                              <form action={moveProductImage}>
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="from" value={i} />
                                <input type="hidden" name="dir" value="right" />
                                <SubmitButton
                                  pendingText="…"
                                  aria-label="뒤로 이동"
                                  className="flex size-4 cursor-pointer items-center justify-center rounded border border-wabi-border text-[10px] leading-none text-wabi-fg transition-colors hover:bg-wabi-muted"
                                >
                                  ▶
                                </SubmitButton>
                              </form>
                            )}
                          </div>
                        </div>
                      ))}
                      <ProductImageAdder productId={p.id} />
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{won(p.price)}</td>
                  <td className="px-4 py-3">
                    <form action={updateStock} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="stock"
                        type="number"
                        min={0}
                        defaultValue={p.stock}
                        aria-label={`${p.name} 재고 수량`}
                        className="w-16 rounded-lg border border-wabi-border bg-wabi-bg/60 px-2 py-1 outline-none transition-colors focus:border-wabi-fg"
                      />
                      <SubmitButton
                        pendingText="저장 중…"
                        className={adminAction({ tone: "outline" })}
                      >
                        저장
                      </SubmitButton>
                      {p.stock === 0 ? (
                        <span className="ml-1 whitespace-nowrap rounded-full border border-red-300 px-2 py-0.5 text-xs text-red-700">
                          품절
                        </span>
                      ) : isLowStock(p.stock) ? (
                        <span className="ml-1 whitespace-nowrap rounded-full border border-amber-300 px-2 py-0.5 text-xs text-amber-800">
                          부족
                        </span>
                      ) : null}
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleMonthly}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="is_monthly"
                        value={String(p.is_monthly)}
                      />
                      <SubmitButton
                        pendingText="변경 중…"
                        className={adminAction({
                          tone: p.is_monthly ? "solid" : "outline",
                        })}
                      >
                        {p.is_monthly ? "지정됨" : "지정"}
                      </SubmitButton>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={String(p.is_active)}
                      />
                      <SubmitButton
                        pendingText="변경 중…"
                        className={adminAction({
                          tone: p.is_active ? "solid" : "outline",
                        })}
                      >
                        {p.is_active ? "노출중" : "숨김"}
                      </SubmitButton>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    {/* 본문(이름·가격·설명·스펙·카테고리) 수정 페이지 */}
                    <Link
                      href={`/admin/products/${p.id}`}
                      className={adminAction({ tone: "outline" })}
                    >
                      수정
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton
                        pendingText="삭제 중…"
                        className={adminAction({ tone: "danger" })}
                      >
                        삭제
                      </SubmitButton>
                    </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablePanel>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
