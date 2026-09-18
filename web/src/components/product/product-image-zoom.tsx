import Image from "next/image";

// 상품 상세 이미지 렌더 — 대표님 요청(2026-08-21): 클릭 확대(줌)·우하단 돋보기 힌트를
// 제거하고 정적 표시만 한다. 상품을 더 크게/자세히 볼 수 없게 하려는 방침이라, 기존의
// 풀스크린 확대 오버레이·확대 힌트 아이콘·클릭 인터랙션을 모두 없앴다.
//
// natural=true 면 원본 비율 그대로(width/height 0 + h-auto·w-full — 상세 갤러리), 아니면
// 부모의 aspect 박스를 fill + object-cover 로 채운다(히어로). 사용처(히어로·갤러리)
// 호환을 위해 컴포넌트 이름·props 는 그대로 유지한다.
export function ProductImageZoom({
  src,
  alt,
  sizes,
  preload = false,
  imgClassName = "object-cover",
  natural = false,
  intrinsic,
}: {
  src: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  imgClassName?: string;
  natural?: boolean;
  // 원본 픽셀 크기 — 알면 넘긴다(lib/image-size). 넘기면 브라우저가 사진이
  // 오기 전에 높이를 잡아 둬 아래 내용이 밀리지 않는다(CLS). 모르면 예전처럼
  // 0 으로 두고 로드 후 높이가 정해진다.
  intrinsic?: { width: number; height: number } | null;
}) {
  if (natural) {
    return (
      <Image
        src={src}
        alt={alt}
        width={intrinsic?.width ?? 0}
        height={intrinsic?.height ?? 0}
        sizes={sizes}
        preload={preload}
        className="h-auto w-full"
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={imgClassName}
    />
  );
}
