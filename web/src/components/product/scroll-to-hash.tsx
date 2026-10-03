"use client";

import { useEffect } from "react";

// 주소의 #id 로 스크롤(#765). 사이트 안 이동(Link)으로 /shop/[id]#reviews 에 오면
// loading.tsx 가 먼저 그려지고 Next 는 그 시점에 #reviews 를 찾는다 → 없으니 맨 위에 멈춘다.
// 실제 섹션이 들어와 이 컴포넌트가 붙을 때 한 번 더 맞춘다(주소로 직접 열 땐 이미 맞아 있어 무해).
export function ScrollToHash({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const el = document.getElementById(id);
    if (!el) return;
    // 한 프레임 뒤: 같은 커밋에서 그려진 위쪽 콘텐츠의 높이가 잡힌 다음.
    const raf = requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return null;
}
