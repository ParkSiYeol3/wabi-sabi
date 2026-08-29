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
    <svg viewBox="0 0 40 40" className="size-9 text-wabi-fg" aria-hidden {...strokeProps}>
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

// 가전 픽토그램
const MicrowaveIcon = (
  <IconBase>
    <rect x="6" y="11" width="28" height="18" rx="1.5" />
    <rect x="9.5" y="14.5" width="15" height="11" rx="1" />
    <path d="M28 15 v10" />
  </IconBase>
);
const OvenIcon = (
  <IconBase>
    <rect x="7" y="9" width="26" height="22" rx="1.5" />
    <path d="M7 16 h26" />
    <path d="M11 12.5 h4 M18 12.5 h4" />
    <rect x="11" y="19.5" width="18" height="8.5" rx="1" />
  </IconBase>
);
const DishwasherIcon = (
  <IconBase>
    <rect x="9" y="7" width="22" height="26" rx="1.5" />
    <path d="M9 13 h22" />
    <circle cx="14" cy="10" r="0.6" />
    <circle cx="18" cy="10" r="0.6" />
    <path d="M15 18 v9 M20 18 v9 M25 18 v9" />
  </IconBase>
);
const DirectHeatIcon = (
  <IconBase>
    <path d="M20 6 c5 6 8 9 8 14 a8 8 0 0 1 -16 0 c0 -3 2 -6 4 -8 c1 3 3 3 4 2 Z" />
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

const APPLIANCES: { en: string; ko: string; note: string; icon: React.ReactNode }[] =
  [
    { en: "MICROWAVE", ko: "전자레인지", note: "제품별 확인", icon: MicrowaveIcon },
    { en: "OVEN", ko: "오븐", note: "제품별 확인", icon: OvenIcon },
    { en: "DISHWASHER", ko: "식기세척기", note: "제품별 확인", icon: DishwasherIcon },
    { en: "DIRECT HEAT", ko: "직화", note: "사용 금지", icon: DirectHeatIcon },
  ];

export function ProductCareGuide() {
  return (
    <section className="mt-14 border-t border-wabi-border pt-10 text-sm">
      {/* PRODUCT CARE — 소재별 주의사항 */}
      <div className="text-center">
        <h2 className="text-lg font-medium tracking-[0.2em] text-wabi-fg">
          PRODUCT CARE
        </h2>
        <p className="mt-3 leading-relaxed text-wabi-fg-muted">
          소재와 제작 방식에 따라 특성이 다릅니다.
          <br />
          아래의 내용을 참고하여 오래도록 아름답게 사용해주세요.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-2xl gap-x-10 gap-y-9 sm:grid-cols-2">
        {MATERIALS.map((m) => (
          <div key={m.en} className="flex gap-4">
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

      {/* ABOUT NATURAL CHANGES — 자연스러운 변화 + 가전 사용 가이드 */}
      <div className="mt-14 border-t border-wabi-border pt-10 text-center">
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

        {/* 시간의 흐름을 뜻하는 나선 곡선(브랜드 모티프) */}
        <svg
          viewBox="0 0 260 70"
          className="mx-auto mt-8 h-12 w-auto text-wabi-fg/35"
          aria-hidden
          {...strokeProps}
        >
          <path d="M130 6 v58 M130 10 C 70 20 70 44 130 40 C 190 36 190 60 130 64 M130 10 C 190 20 190 44 130 40 C 70 36 70 60 130 64" />
        </svg>

        <ul className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-y-8 sm:grid-cols-4">
          {APPLIANCES.map((a) => (
            <li key={a.en} className="flex flex-col items-center gap-2 px-2">
              {a.icon}
              <span className="text-xs font-medium tracking-[0.1em] text-wabi-fg">
                {a.en}
              </span>
              <span className="text-xs text-wabi-fg-muted">{a.ko}</span>
              <span className="text-xs text-wabi-fg-muted">{a.note}</span>
            </li>
          ))}
        </ul>

        <p className="mt-9 leading-relaxed text-xs text-wabi-fg-muted">
          제품별로 사용 가능 여부가 다를 수 있으니
          <br />
          위 소재별 안내와 상품 정보를 함께 확인해주세요.
        </p>
      </div>
    </section>
  );
}
