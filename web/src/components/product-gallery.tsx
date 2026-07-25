import Image from "next/image";
import { ImageIcon } from "lucide-react";

// 상품 상세 이미지 갤러리 (#248, 대표님 시안 — tableofcraft 식 세로 스크롤).
// 여러 장을 세로로 죽 나열해 스크롤로 본다(이전엔 썸네일 클릭 전환이라 한 번에
// 한 장만 크게 볼 수 있었다). 상태가 없어 서버 컴포넌트다 — 첫 장만 즉시 로드,
// 나머지는 스크롤로 들어올 때 lazy.
export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center bg-wabi-muted">
        <ImageIcon
          className="size-12 text-wabi-fg-muted/40"
          strokeWidth={1}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {images.map((src, i) => (
        <div
          key={i}
          className="relative aspect-square overflow-hidden bg-wabi-muted"
        >
          <Image
            src={src}
            alt={i === 0 ? name : `${name} 상세 이미지 ${i + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            // 첫 장은 LCP 후보라 즉시, 나머지는 스크롤 진입 시 lazy.
            preload={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}
    </div>
  );
}
