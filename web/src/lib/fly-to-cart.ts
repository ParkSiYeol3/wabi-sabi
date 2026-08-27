// 담기 → 장바구니 마이크로 인터랙션(대표님). 담기를 누르면 상품 썸네일 고스트가
// 버튼 위치에서 헤더 장바구니 아이콘으로 부드럽게 날아가 담김을 시각적으로 알린다.
// 브랜드 절제에 맞춰 짧고 은은하게, reduced-motion 사용자에겐 아예 실행하지 않는다.
//
// 순수 DOM 조작(React 밖) — 짧게 살았다 사라지는 장식이라 상태로 관리하지 않는다.
// 장바구니 아이콘은 [data-cart-icon] 으로 찾는다(site-header).
export function flyToCart(fromRect: DOMRect, imageUrl: string | null): void {
  if (typeof window === "undefined" || !imageUrl) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const target = document.querySelector<HTMLElement>("[data-cart-icon]");
  if (!target) return;
  const to = target.getBoundingClientRect();

  const SIZE = 64;
  const startX = fromRect.left + fromRect.width / 2 - SIZE / 2;
  const startY = fromRect.top + fromRect.height / 2 - SIZE / 2;
  const dx = to.left + to.width / 2 - (startX + SIZE / 2);
  const dy = to.top + to.height / 2 - (startY + SIZE / 2);

  const ghost = document.createElement("img");
  ghost.src = imageUrl;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    objectFit: "cover",
    borderRadius: "9999px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
    zIndex: "60",
    pointerEvents: "none",
    opacity: "0.95",
    transition: "transform 0.7s cubic-bezier(0.5,0,0.2,1), opacity 0.7s ease-in",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);

  // 다음 프레임에 목표로 이동 — 초기 스타일이 적용된 뒤 트랜지션이 걸리게.
  requestAnimationFrame(() => {
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.18)`;
    ghost.style.opacity = "0.2";
  });

  const cleanup = () => ghost.remove();
  ghost.addEventListener("transitionend", cleanup, { once: true });
  // 트랜지션 이벤트 누락(탭 비활성 등) 대비 안전 제거.
  window.setTimeout(cleanup, 900);
}
