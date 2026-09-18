import { unstable_cache } from "next/cache";

import { fromJpeg, fromPng, fromWebp, type ImageSize } from "@/lib/image-header";

// 상품 상세 갤러리의 원본 크기 조회.
//
// 갤러리는 사진을 원본 비율 그대로 그린다(#502, 대표님) — 잘리면 그릇 모양이
// 달라 보이기 때문이다. 그래서 next/image 에 width/height 를 0 으로 넘기고
// 높이를 브라우저에 맡겨 왔는데, 그러면 사진이 도착하기 전까지 그 자리의 높이가
// 0 이라 사진이 뜨는 순간 아래 내용이 통째로 밀린다. 2026-09-18 프로덕션
// Lighthouse 에서 상품 상세 CLS 0.203 (기준 0.1) — 가장 큰 밀림 하나가 푸터를
// 749px 밀어 올렸다.
//
// 원본 크기를 DB 에 들고 있지 않으므로 파일 앞부분만 Range 로 받아 헤더에서 읽는다.
// 저장된 파일은 URL 이 곧 내용이라(업로드마다 새 파일명) 오래 캐시해도 안전하다.
// 실패하면 null — 호출부는 예전처럼 그리므로 사진이 안 뜨는 일은 없다.

export type { ImageSize };

// SOF 앞에 EXIF 썸네일이 통째로 들어간 JPEG 도 있어 넉넉히 받는다.
const HEAD_BYTES = 131072;

// next.config 의 images.remotePatterns 와 같은 범위 — 우리 스토리지 공개 경로만.
// 조회 주소는 DB(products.images)에서 오므로 값이 어쩌다 바뀌어도 서버가 바깥으로
// 요청을 나가지 않게 막아 둔다(SSRF).
const STORAGE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

function allowed(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      !!STORAGE_HOST &&
      u.hostname === STORAGE_HOST &&
      u.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}

async function probeImageSize(url: string): Promise<ImageSize | null> {
  if (!allowed(url)) return null;
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${HEAD_BYTES - 1}` },
      // 렌더를 붙잡지 않는다 — 못 읽으면 예전 동작(비율 미상)으로 떨어질 뿐이다.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const b = Buffer.from(await res.arrayBuffer());
    return fromPng(b) ?? fromJpeg(b) ?? fromWebp(b);
  } catch {
    return null;
  }
}

// URL 단위 캐시(30일). 파일명이 업로드마다 바뀌므로 같은 URL 의 내용은 변하지 않는다.
export const getImageSize = unstable_cache(probeImageSize, ["image-size"], {
  revalidate: 60 * 60 * 24 * 30,
});

// 여러 장을 한 번에 — 실패한 장은 null 로 남는다.
export async function getImageSizes(
  urls: string[],
): Promise<Map<string, ImageSize>> {
  const sizes = await Promise.all(urls.map((u) => getImageSize(u)));
  const out = new Map<string, ImageSize>();
  urls.forEach((u, i) => {
    const s = sizes[i];
    if (s && s.width > 0 && s.height > 0) out.set(u, s);
  });
  return out;
}
