// 업로드 전 클라이언트 리사이즈 (대표님 — 모바일에서 사진 여러 장 등록 시 원본이
// 커 서버액션 바디 한도를 넘겨 실패). 긴 변을 maxPx 로 줄이고 JPEG 로 재인코딩해
// 장당 수백 KB 로 만든다. 여러 장을 올려도 한도에 안 걸리고, 상세 로딩도 빨라진다.
//
// 브라우저 전용(canvas). iOS 는 file input 업로드 시 HEIC 를 JPEG 로 변환해 주므로
// createImageBitmap 이 디코드할 수 있다. 어떤 이유로든 실패하면 원본 File 을 그대로
// 반환해(폴백) 업로드 자체는 막지 않는다.
export async function resizeImage(
  file: File,
  maxPx = 2000,
  quality = 0.82,
): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file;
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxPx / longest);
    // 이미 충분히 작으면(축소 불필요 + 1.5MB 미만) 재인코딩 없이 원본 유지.
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;
    // 리사이즈가 오히려 더 크면(작은 원본 등) 원본을 쓴다.
    if (blob.size >= file.size) return file;
    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

// FormData 의 이미지 필드를 전부 리사이즈본으로 교체(등록·이미지 추가 공용).
export async function resizeFormImages(
  formData: FormData,
  field = "images",
): Promise<void> {
  const files = formData
    .getAll(field)
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;
  const resized = await Promise.all(files.map((f) => resizeImage(f)));
  formData.delete(field);
  for (const f of resized) formData.append(field, f);
}
