"use client";

import { useSyncExternalStore } from "react";
import { STAFF_DEVICE_KEY } from "@/components/common/visit-beacon";

// "이 기기 방문 제외"(0070, 시열님 결정) — 대표님·시열님이 로그아웃 상태로 매장을
// 둘러봐도 손님 통계에 섞이지 않게, 이 브라우저를 직원 기기로 표시한다. 관리자로
// 로그인한 방문은 서버가 따로 거르므로, 이건 로그아웃 상태·다른 브라우저용이다.
// 브라우저마다 따로 저장되므로 휴대폰·노트북·매장 PC 에서 각각 한 번씩 눌러야 한다.

const EVENT = "wasa:staff-device";

function read(): boolean {
  try {
    return localStorage.getItem(STAFF_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function StaffDeviceToggle() {
  // 서버 렌더에선 알 수 없으므로 null(표시 보류) — 하이드레이션 뒤 실제 값.
  const on = useSyncExternalStore(subscribe, read, () => null);
  if (on === null) return null;

  const toggle = () => {
    try {
      if (on) localStorage.removeItem(STAFF_DEVICE_KEY);
      else localStorage.setItem(STAFF_DEVICE_KEY, "1");
    } catch {
      return;
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`shrink-0 border px-3 py-1.5 text-xs transition-colors ${
        on
          ? "border-wabi-accent bg-wabi-accent text-white"
          : "border-wabi-border text-wabi-fg-muted hover:text-wabi-fg"
      }`}
    >
      {on ? "이 기기 방문 제외 중" : "이 기기 방문 제외"}
    </button>
  );
}
