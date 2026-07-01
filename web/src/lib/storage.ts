import { createAdminClient } from "@/lib/supabase/admin";

export const PRODUCT_BUCKET = "product-images";

// 상품 이미지 업로드 → 공개 URL 배열 반환. (어드민 service_role 전용)
export async function uploadProductImages(
  productId: string,
  files: File[],
): Promise<string[]> {
  const supabase = createAdminClient();
  const urls: string[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${productId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(PRODUCT_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "image/png",
        upsert: false,
      });
    if (error) continue;

    const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

// 공개 URL → 버킷 내부 경로 추출 (삭제용). 실패 시 null.
export function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

// 스토리지 파일 삭제 (URL 기반).
export async function deleteProductImage(url: string): Promise<void> {
  const path = storagePathFromUrl(url);
  if (!path) return;
  const supabase = createAdminClient();
  await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
}
