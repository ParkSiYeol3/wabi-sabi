// 제품 사용 안내(PRODUCT CARE) — 대표님이 정리한 인쇄용 케어 카드(앞/뒤)를 상품
// 상세의 "사용 및 관리" 자리에 그대로 옮긴 것. 소재별 주의사항 + 자연스러운 변화
// 안내 + 가전 사용 가이드. 재질/가전 픽토그램은 카드의 얇은 라인 톤에 맞춰 자체
// SVG 로 그린다(lucide 에 없는 오븐·식기세척기·우드 접시 등 포함, 굵기 일관).
// 훅 없는 정적 컴포넌트라 서버에서 그대로 렌더된다.

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 40 40" className="size-7 text-wabi-fg sm:size-9" aria-hidden {...strokeProps}>
      {children}
    </svg>
  );
}

// 소재 픽토그램
const CeramicIcon = (
  <IconBase>
    <path d="M8 18 h24 a12 12 0 0 1 -24 0 Z" />
    <path d="M13 14.5 q7 -3 14 0" />
  </IconBase>
);
const GlassIcon = (
  <IconBase>
    <path d="M14 9 h12 l-1.5 22 h-9 Z" />
    <path d="M15 15 h10" />
  </IconBase>
);
const StainlessIcon = (
  <IconBase>
    <ellipse cx="15" cy="13" rx="4.5" ry="6" />
    <path d="M15 19 v13" />
  </IconBase>
);
const WoodIcon = (
  <IconBase>
    <ellipse cx="20" cy="20" rx="15" ry="8" />
    <ellipse cx="20" cy="20" rx="9.5" ry="5" />
    <ellipse cx="20" cy="20" rx="4" ry="2" />
  </IconBase>
);

type Material = {
  en: string;
  ko: string;
  icon: React.ReactNode;
  cautions: string[];
};

const MATERIALS: Material[] = [
  {
    en: "CERAMIC",
    ko: "세라믹",
    icon: CeramicIcon,
    cautions: [
      "급격한 온도 변화 주의",
      "스크래치에 주의",
      "전자레인지, 오븐, 식기세척기 사용 여부는 제품별 확인",
    ],
  },
  {
    en: "GLASS",
    ko: "글라스",
    icon: GlassIcon,
    cautions: [
      "급격한 온도 변화 주의",
      "강한 충격에 주의",
      "전자레인지, 오븐, 식기세척기 사용 여부는 제품별 확인",
    ],
  },
  {
    en: "STAINLESS STEEL",
    ko: "스테인리스",
    icon: StainlessIcon,
    cautions: [
      "스크래치에 주의",
      "염분, 산성 음식 장시간 보관 주의",
      "전자레인지 사용 금지",
    ],
  },
  {
    en: "WOOD",
    ko: "우드",
    icon: WoodIcon,
    cautions: [
      "장시간 물에 담금 금지",
      "직사광선, 건조한 환경 주의",
      "전자레인지, 오븐, 식기세척기, 직화 사용 금지",
    ],
  },
];

export function ProductCareGuide() {
  return (
    <section className="mt-10 border-t border-wabi-border pt-7 text-xs sm:mt-14 sm:pt-10 sm:text-sm">
      {/* PRODUCT CARE — 소재별 주의사항 */}
      <div className="text-center">
        <h2 className="text-base font-medium tracking-[0.2em] text-wabi-fg sm:text-lg">
          PRODUCT CARE
        </h2>
        <p className="mt-3 leading-relaxed text-wabi-fg-muted">
          소재와 제작 방식에 따라 특성이 다릅니다.
          <br />
          아래의 내용을 참고하여 오래도록 아름답게 사용해주세요.
        </p>
      </div>

      <div className="mx-auto mt-7 grid max-w-2xl gap-x-6 gap-y-6 sm:mt-10 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-9">
        {MATERIALS.map((m) => (
          <div key={m.en} className="flex gap-3 sm:gap-4">
            <div className="shrink-0 pt-0.5">{m.icon}</div>
            <div className="min-w-0">
              <p className="font-medium tracking-[0.12em] text-wabi-fg">{m.en}</p>
              <p className="text-xs text-wabi-fg-muted">{m.ko}</p>
              <ul className="mt-2.5 space-y-1 leading-relaxed text-wabi-fg-muted">
                {m.cautions.map((c, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span aria-hidden className="text-wabi-fg-muted/60">
                      ·
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* ABOUT NATURAL CHANGES — 자연스러운 변화 안내(대표님: 가전 픽토그램·나선·하단
          문구는 제거, 텍스트만 유지). */}
      <div className="mt-10 border-t border-wabi-border pt-8 text-center sm:mt-14 sm:pt-10">
        <h2 className="tracking-[0.2em] text-wabi-fg">ABOUT NATURAL CHANGES</h2>
        <p className="mt-3 leading-relaxed text-wabi-fg-muted">
          작은 점, 색의 차이, 미세한 스크래치 등은
          <br />
          소재와 제작 과정에서 생기는 자연스러운 특성입니다.
          <br />
          사용 시간이 쌓이며 생기는 변화는
          <br />
          제품의 일부이자, 당신의 시간이 더해지는 과정입니다.
        </p>
      </div>
    </section>
  );
}
