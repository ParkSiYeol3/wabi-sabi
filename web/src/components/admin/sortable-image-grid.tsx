"use client";

import { useRef, useState, type ReactNode, type PointerEvent } from "react";

// 이미지 순서 드래그 재배치(대표님 — ◀▶ 하나씩 클릭 대신 끌어서 이동). 라이브러리
// 없이 Pointer Events 로 마우스·터치 모두 지원한다. 드래그는 소비자가 렌더한
// 손잡이([data-drag-handle], touch-action:none)에서 시작한 경우에만 작동해 페이지
// 스크롤·다른 버튼 클릭과 충돌하지 않는다. 드래그 중 포인터 아래 항목(data-sort-id)을
// 찾아 즉시 자리를 바꾸고(onReorder), 놓으면 onDragEnd 로 확정한다(서버 저장 등).
export function SortableImageGrid({
  ids,
  onReorder,
  onDragEnd,
  renderItem,
  className,
  itemClassName,
}: {
  /** 현재 순서의 안정적 키 목록. */
  ids: string[];
  /** from 위치 항목을 to 위치로 이동. */
  onReorder: (from: number, to: number) => void;
  /** 드래그 종료(놓기) 시. 확정 저장용. */
  onDragEnd?: () => void;
  /** 항목 내부 렌더. 손잡이 버튼에 data-drag-handle 과 touch-action:none 을 준다. */
  renderItem: (id: string, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const lastOverRef = useRef<string | null>(null);
  const movedRef = useRef(false);

  function onPointerDown(e: PointerEvent, id: string) {
    // 손잡이에서 시작한 드래그만 처리 — 그 외(삭제·편집 버튼, 이미지)는 그대로.
    if (!(e.target as HTMLElement).closest("[data-drag-handle]")) return;
    setDragId(id);
    lastOverRef.current = id;
    movedRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const overId = el?.closest<HTMLElement>("[data-sort-id]")?.dataset.sortId;
    if (!overId || overId === lastOverRef.current) return;
    lastOverRef.current = overId;
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(overId);
    if (from >= 0 && to >= 0 && from !== to) {
      movedRef.current = true;
      onReorder(from, to);
    }
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragId) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDragId(null);
    lastOverRef.current = null;
    if (movedRef.current) onDragEnd?.();
    movedRef.current = false;
  }

  return (
    <ul className={className}>
      {ids.map((id, i) => (
        <li
          key={id}
          data-sort-id={id}
          onPointerDown={(e) => onPointerDown(e, id)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative ${itemClassName ?? ""} ${
            dragId === id ? "opacity-50 ring-2 ring-wabi-accent" : ""
          }`}
        >
          {renderItem(id, i)}
        </li>
      ))}
    </ul>
  );
}
