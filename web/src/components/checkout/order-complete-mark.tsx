// 주문 완료 표시 — 엔소(円相). 선(禪)에서 붓으로 단숨에 그리는 '열린 원'으로,
// 불완전함 속의 원만·완성을 뜻한다(侘寂). 일반적인 체크 아이콘 대신 브랜드 붓
// 마크와 통일된 인장을 준다(대표님 — 체크 말고 다른 표시). CSS 만으로 붓이
// 그려지듯 나타나고, prefers-reduced-motion 은 존중해 즉시 완성형으로 보인다.
// 서버 컴포넌트에서 그대로 쓸 수 있게 훅 없이 마크업만 반환한다.
export function OrderCompleteMark() {
  return (
    <span className="inline-flex" aria-hidden>
      <svg
        viewBox="0 0 80 80"
        className="size-16 text-wabi-fg"
        fill="none"
        role="img"
      >
        {/* 위쪽이 살짝 열린 원(円相). round cap 으로 붓끝 느낌, 살짝 기울여 인장처럼. */}
        <path
          className="ws-enso-path"
          d="M50.26 11.8 A30 30 0 1 1 29.74 11.8"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          transform="rotate(12 40 40)"
          pathLength={1}
        />
      </svg>
      <style>{`
        .ws-enso-path { stroke-dasharray: 1; stroke-dashoffset: 0; }
        @media (prefers-reduced-motion: no-preference) {
          .ws-enso-path { animation: ws-enso-draw 1.1s cubic-bezier(0.4, 0, 0.2, 1) both; }
          @keyframes ws-enso-draw {
            from { stroke-dashoffset: 1; }
            to { stroke-dashoffset: 0; }
          }
        }
      `}</style>
    </span>
  );
}
