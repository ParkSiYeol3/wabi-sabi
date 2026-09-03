import { cn } from "@/lib/utils";

// 제품 사용 안내(PRODUCT CARE) — 대표님이 정리한 인쇄용 케어 카드를 상품 상세의
// "사용 및 관리" 자리에 그대로 옮긴 것. 소재 4종(도자기·유리·스테인리스·나무)을
// 십자 구분선 2×2 로 두고, 아래에 자연스러운 변화 안내 + 가전 사용 가이드.
// 가전 픽토그램은 카드의 얇은 라인 톤에 맞춰 자체 SVG 로 그린다(lucide 에 없는
// 오븐·식기세척기 포함, 굵기 일관). 훅 없는 정적 컴포넌트라 서버에서 렌더된다.

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className="size-8 text-wabi-fg sm:size-10"
      aria-hidden
      {...strokeProps}
    >
      {children}
    </svg>
  );
}

// 가전 픽토그램 — 카드 하단 사용 가이드.
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

// 소재별 안내 — 문단 단위. 셀 폭이 좁아 줄바꿈은 브라우저에 맡긴다(반응형).
type Material = { en: string; ko: string; notes: string[] };

const MATERIALS: Material[] = [
  {
    en: "CERAMIC",
    ko: "도자기",
    notes: [
      "전자레인지와 식기세척기 사용이 가능합니다. 다만 오래 사용할수록 자연스럽게 변화할 수 있습니다.",
      "오븐과 직화 사용은 피해 주세요. 급격한 온도 변화는 제품에 무리를 줄 수 있습니다.",
      "사용 후에는 바로 세척하는걸 권장드립니다.",
      "작은 기포와 철점, 크랙은 손으로 빚어낸 도자기만의 자연스러운 흔적입니다.",
    ],
  },
  {
    en: "GLASS",
    ko: "유리",
    notes: [
      "전자레인지와 식기세척기 사용 여부는 제품에 따라 다를 수 있으니 주의해주세요.",
      "뜨거운 유리 제품에 갑자기 찬물을 붓거나 급격한 온도 변화를 주지 마세요.",
      "작은 기포와 미세한 흔적은 유리를 만드는 과정에서 생기는 자연스러운 결입니다.",
    ],
  },
  {
    en: "STAINLESS",
    ko: "스테인리스",
    notes: [
      "사용 후에는 부드러운 스펀지로 세척하고 물기를 닦아 건조해주세요.",
      "강한 마찰이나 거친 수세미는 표면에 흠집을 남길 수 있습니다.",
      "염분이나 산성 성분이 오래 닿아있지 않도록 해주세요. 시간에 따라 자연스럽게 표면의 결이 달라질 수 있습니다.",
    ],
  },
  {
    en: "WOOD",
    ko: "나무",
    notes: [
      "사용 후에는 물에 오래 담가두지 말고 부드럽게 세척한 뒤 충분히 건조해주세요.",
      "전자레인지, 식기세척기와 뜨거운 열은 피해 주세요. 급격한 온도와 습도 변화는 변형을 일으킬 수 있습니다.",
      "나무의 색과 결은 시간이 지나며 조금씩 달라집니다. 사용할수록 깊어지는 자연스러운 변화를 즐겨주세요.",
    ],
  },
];

const APPLIANCES: {
  en: string;
  ko: string;
  note: string;
  icon: React.ReactNode;
}[] = [
  { en: "MICROWAVE", ko: "전자레인지", note: "제품별 확인", icon: MicrowaveIcon },
  { en: "OVEN", ko: "오븐", note: "사용 불가", icon: OvenIcon },
  { en: "DISHWASHER", ko: "식기세척기", note: "제품별 확인", icon: DishwasherIcon },
  { en: "DIRECT HEAT", ko: "직화", note: "사용 금지", icon: DirectHeatIcon },
];

export function ProductCareGuide() {
  return (
    <section className="mt-10 border-t border-wabi-border pt-8 text-xs sm:mt-14 sm:pt-12 sm:text-sm">
      {/* 머리글 — WABI SABI / 얇은 선 / PRODUCT CARE */}
      <div className="text-center">
        <p className="text-[10px] tracking-[0.35em] text-wabi-fg-muted sm:text-xs">
          WABI SABI
        </p>
        <span aria-hidden className="mx-auto mt-2.5 block h-px w-7 bg-wabi-border" />
        <h2 className="mt-3 text-lg font-medium tracking-[0.25em] text-wabi-fg sm:text-2xl">
          PRODUCT CARE
        </h2>
        <p className="mt-4 leading-relaxed text-wabi-fg-muted sm:mt-5">
          소재와 제작 방식에 따라 특성이 다릅니다.
          <br />
          아래의 내용을 참고하여 오래도록 아름답게 사용해주세요.
        </p>
      </div>

      {/* 소재 4종 — 데스크톱은 십자 구분선 2×2, 모바일은 1열(구분선은 아래쪽만). */}
      <div className="mx-auto mt-8 grid max-w-3xl sm:mt-12 sm:grid-cols-2">
        {MATERIALS.map((m, i) => (
          <div
            key={m.en}
            className={cn(
              "px-1 py-7 text-center sm:px-9 sm:py-8",
              // 모바일 1열 — 마지막 칸 빼고 아래 구분선.
              i < MATERIALS.length - 1 && "border-b border-wabi-border",
              // 데스크톱 2×2 — 왼쪽 열엔 세로선, 윗줄엔 가로선(십자).
              i % 2 === 0 && "sm:border-r sm:border-wabi-border",
              i < 2 ? "sm:border-b sm:border-wabi-border" : "sm:border-b-0",
            )}
          >
            <p className="text-base font-medium tracking-[0.15em] text-wabi-fg sm:text-lg">
              {m.en}
            </p>
            <p className="mt-1 text-xs text-wabi-fg-muted">{m.ko}</p>
            <div className="mt-4 space-y-3.5 leading-relaxed text-wabi-fg-muted sm:mt-5">
              {m.notes.map((n, k) => (
                <p key={k}>{n}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 자연스러운 변화 안내 — 시안에는 제목 없이 문구만. */}
      <p className="mx-auto mt-10 max-w-xl text-center leading-loose text-wabi-fg sm:mt-14 sm:text-base">
        작은 점, 색의 차이, 미세한 스크래치 등은
        <br />
        소재와 제작 과정에서 생기는 자연스러운 특성입니다.
        <br />
        사용 시간이 쌓이며 생기는 변화는
        <br />
        제품의 일부이자, 시간이 더해지는 과정입니다.
      </p>

      {/* 가전 사용 가이드 — 모바일 2열, 데스크톱 4열. */}
      <ul className="mx-auto mt-10 grid max-w-xl grid-cols-2 gap-y-8 sm:mt-14 sm:grid-cols-4">
        {APPLIANCES.map((a) => (
          <li key={a.en} className="flex flex-col items-center gap-1.5 px-2">
            {a.icon}
            <span className="mt-1 text-[11px] font-medium tracking-[0.1em] text-wabi-fg">
              {a.en}
            </span>
            <span className="text-[11px] text-wabi-fg-muted">{a.ko}</span>
            <span className="text-[11px] text-wabi-fg-muted">{a.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
