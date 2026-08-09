// 가격 표기(대표님) — 숫자는 Cormorant 로 크게, 통화 "원"은 작고 흐린 접미로
// 위계를 준다. 숫자(Cormorant)와 한글(마루부리)이 같은 크기로 부딪히던 문제 해결.
// 숫자는 부모 크기를 상속하고, "원"만 상대적으로 작게(0.72em)·muted·보통 굵기.
export function Price({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  // "원"은 baseline 에 두면 작아서 큰 숫자 밑으로 가라앉아 보인다 → align-middle 로
  // 숫자 중앙선에 맞춰 올린다(대표님/시열님 "동일선상").
  return (
    <span className={className}>
      <span className="font-numeric">{value.toLocaleString("ko-KR")}</span>
      <span className="relative top-[-0.09em] ml-0.5 align-middle text-[0.78em] font-normal text-wabi-fg-muted">
        원
      </span>
    </span>
  );
}
