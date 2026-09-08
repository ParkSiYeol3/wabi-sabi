import type { KeyboardEvent } from "react";

// 엔터로 폼이 통째로 저장되는 것 막기 (대표님 2026-09-08).
//
// 브라우저는 한 줄 입력칸(<input>)에서 엔터를 치면 폼을 암묵적으로 제출한다
// (implicit submission). 글을 쓰다 줄을 바꾸려고, 혹은 다음 칸으로 넘어가려고
// 누른 엔터가 곧바로 "저장"이 돼 버려 대표님이 여러 번 당했다.
//
// 그래서 한 줄 입력칸에서 온 엔터만 삼킨다. textarea 의 줄바꿈과 버튼 위에서 누른
// 엔터(저장 버튼에 포커스를 두고 누르는 경우)는 그대로 둬야 키보드만으로도 저장할
// 수 있다. 한글 조합 중(isComposing)인 엔터는 글자를 확정하는 입력이라 건드리지 않는다.
export function blockImplicitSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter" || e.shiftKey) return;
  if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return;

  const el = e.target as HTMLElement | null;
  if (!el) return;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    if (type === "submit" || type === "button" || type === "checkbox") return;
  }
  e.preventDefault();
}
