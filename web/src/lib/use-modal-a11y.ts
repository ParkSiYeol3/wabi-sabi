import { useEffect, useRef } from "react";

// 모달 접근성 공통 훅 — 열려 있는 동안:
//  · 바디 스크롤 잠금
//  · Escape 로 닫기(onClose)
//  · 열릴 때 직전 포커스를 저장하고 다이얼로그의 첫 포커서블(없으면 컨테이너)로 이동
//  · Tab 이 다이얼로그 밖으로 못 나가게 순환(포커스 트랩 — 키보드/스크린리더 사용자)
//  · 닫힐 때 열기 전 요소(트리거 버튼)로 포커스 복귀
// 반환된 ref 를 다이얼로그 컨테이너 div 에 붙인다(tabIndex={-1} 권장 — 포커서블이 없을
// 때의 폴백). 다이얼로그가 열려 있을 때 처리가 필요 없는 상황(embed iframe 위젯 등)엔
// 트랩이 오히려 방해되므로 쓰지 않는다.
export function useModalA11y(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  // 최신 onClose 를 ref 로 들고 있어(effect 는 open 만 의존) 매 렌더 재실행을 피한다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    const prevActive = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = (): HTMLElement[] =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];

    // 초기 포커스 — 첫 포커서블(없으면 컨테이너 자체).
    (focusables()[0] ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // 열기 전 요소로 포커스 복귀(트리거가 비활성이면 조용히 무시됨).
      prevActive?.focus?.();
    };
  }, [open]);

  return ref;
}
