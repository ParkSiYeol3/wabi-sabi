import type { ReactNode } from "react";
import {
  getSiteContent,
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  HOME_PILLAR_KEYS,
  DEFAULT_PILLARS,
  HOME_PILLAR_LABEL_KEYS,
  DEFAULT_PILLAR_LABELS,
  HOME_CTA_KEY,
  DEFAULT_HOME_CTA,
  ABOUT_IMAGE_KEY,
  PREP_NOTICE_KEY,
  PREP_NOTICE_TEXT_KEY,
  DEFAULT_PREP_NOTICE_TEXT,
  CRITERIA_LABEL_KEYS,
  CRITERIA_BODY_KEYS,
  CRITERIA_SUBTITLE_KEY,
  CRITERIA_HEADING_KEY,
  DEFAULT_CRITERIA_LABELS,
  DEFAULT_CRITERIA_BODIES,
  DEFAULT_CRITERIA_SUBTITLE,
  DEFAULT_CRITERIA_HEADING,
  SHIPPING_INFO_KEY,
  DEFAULT_SHIPPING_INFO,
  SHIPPING_FEE_KEY,
  DEFAULT_SHIPPING_FEE,
  CARE_USAGE_KEY,
  DEFAULT_CARE_USAGE,
  CARE_MAINTAIN_KEY,
  DEFAULT_CARE_MAINTAIN,
  CARE_USAGE_LABEL_KEY,
  DEFAULT_CARE_USAGE_LABEL,
  CARE_MAINTAIN_LABEL_KEY,
  DEFAULT_CARE_MAINTAIN_LABEL,
} from "@/lib/queries/content";
import { PageHeader, SectionHeading } from "@/components/admin/ui";
import { ContentField } from "@/components/admin/content-field";
import { AboutImageField } from "@/components/admin/about-image-field";
import { PrepNoticeField } from "@/components/admin/prep-notice-field";

// 페이지별 그룹 블록 — 어느 화면의 문구인지 한눈에(대표님). 큰 페이지 라벨 +
// 앵커(점프 내비 대상). 내부에 해당 페이지의 편집 섹션들을 담는다.
function PageBlock({
  id,
  label,
  note,
  children,
}: {
  id: string;
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-6">
      <div className="border-b-2 border-wabi-fg/80 pb-2">
        <h2 className="text-lg font-semibold tracking-tight text-wabi-fg">
          {label}
        </h2>
        {note && <p className="mt-1 text-xs text-wabi-fg-muted">{note}</p>}
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

// 상단 점프 내비 항목(페이지 블록 id 와 일치).
const CONTENT_NAV = [
  { id: "g-home", label: "홈" },
  { id: "g-about", label: "About (소개)" },
  { id: "g-product", label: "상품 상세" },
  { id: "g-global", label: "전역 설정" },
] as const;

export default async function AdminContentPage() {
  // 각 편집 값(미저장이면 기본 문구). 병렬 조회.
  const [
    philosophy,
    wabiLabel,
    sabiLabel,
    selectLabel,
    wabi,
    sabi,
    select,
    cta,
    aboutImage,
    prepNotice,
    prepNoticeText,
    critSubtitle,
    critLabel1,
    critLabel2,
    critLabel3,
    critBody1,
    critBody2,
    critBody3,
    critHeading,
    shippingInfo,
    shippingFee,
    careUsageLabel,
    careUsage,
    careMaintainLabel,
    careMaintain,
  ] = await Promise.all([
    getSiteContent(PHILOSOPHY_KEY),
    getSiteContent(HOME_PILLAR_LABEL_KEYS[0]),
    getSiteContent(HOME_PILLAR_LABEL_KEYS[1]),
    getSiteContent(HOME_PILLAR_LABEL_KEYS[2]),
    getSiteContent(HOME_PILLAR_KEYS[0]),
    getSiteContent(HOME_PILLAR_KEYS[1]),
    getSiteContent(HOME_PILLAR_KEYS[2]),
    getSiteContent(HOME_CTA_KEY),
    getSiteContent(ABOUT_IMAGE_KEY),
    getSiteContent(PREP_NOTICE_KEY),
    getSiteContent(PREP_NOTICE_TEXT_KEY),
    getSiteContent(CRITERIA_SUBTITLE_KEY),
    getSiteContent(CRITERIA_LABEL_KEYS[0]),
    getSiteContent(CRITERIA_LABEL_KEYS[1]),
    getSiteContent(CRITERIA_LABEL_KEYS[2]),
    getSiteContent(CRITERIA_BODY_KEYS[0]),
    getSiteContent(CRITERIA_BODY_KEYS[1]),
    getSiteContent(CRITERIA_BODY_KEYS[2]),
    getSiteContent(CRITERIA_HEADING_KEY),
    getSiteContent(SHIPPING_INFO_KEY),
    getSiteContent(SHIPPING_FEE_KEY),
    getSiteContent(CARE_USAGE_LABEL_KEY),
    getSiteContent(CARE_USAGE_KEY),
    getSiteContent(CARE_MAINTAIN_LABEL_KEY),
    getSiteContent(CARE_MAINTAIN_KEY),
  ]);

  const criteria = [
    {
      n: "01",
      label: CRITERIA_LABEL_KEYS[0],
      body: CRITERIA_BODY_KEYS[0],
      lv: critLabel1,
      bv: critBody1,
      dl: DEFAULT_CRITERIA_LABELS.criteria_1_label,
      db: DEFAULT_CRITERIA_BODIES.criteria_1_body,
    },
    {
      n: "02",
      label: CRITERIA_LABEL_KEYS[1],
      body: CRITERIA_BODY_KEYS[1],
      lv: critLabel2,
      bv: critBody2,
      dl: DEFAULT_CRITERIA_LABELS.criteria_2_label,
      db: DEFAULT_CRITERIA_BODIES.criteria_2_body,
    },
    {
      n: "03",
      label: CRITERIA_LABEL_KEYS[2],
      body: CRITERIA_BODY_KEYS[2],
      lv: critLabel3,
      bv: critBody3,
      dl: DEFAULT_CRITERIA_LABELS.criteria_3_label,
      db: DEFAULT_CRITERIA_BODIES.criteria_3_body,
    },
  ];
  const pillars = [
    {
      mark: "侘 (첫 번째)",
      labelKey: HOME_PILLAR_LABEL_KEYS[0],
      bodyKey: HOME_PILLAR_KEYS[0],
      lv: wabiLabel,
      bv: wabi,
      dl: DEFAULT_PILLAR_LABELS.home_pillar_wabi_label,
      db: DEFAULT_PILLARS.home_pillar_wabi,
    },
    {
      mark: "寂 (두 번째)",
      labelKey: HOME_PILLAR_LABEL_KEYS[1],
      bodyKey: HOME_PILLAR_KEYS[1],
      lv: sabiLabel,
      bv: sabi,
      dl: DEFAULT_PILLAR_LABELS.home_pillar_sabi_label,
      db: DEFAULT_PILLARS.home_pillar_sabi,
    },
    {
      mark: "選 (세 번째)",
      labelKey: HOME_PILLAR_LABEL_KEYS[2],
      bodyKey: HOME_PILLAR_KEYS[2],
      lv: selectLabel,
      bv: select,
      dl: DEFAULT_PILLAR_LABELS.home_pillar_select_label,
      db: DEFAULT_PILLARS.home_pillar_select,
    },
  ];

  return (
    <>
      <PageHeader
        title="사이트 콘텐츠"
        description="페이지별로 노출 문구를 편집합니다. 아래 이동 버튼으로 원하는 페이지로 바로 가세요. 항목마다 개별 저장합니다."
      />

      {/* 페이지 점프 내비 — 어느 페이지 문구를 고칠지 바로 이동(대표님) */}
      <nav className="mb-10 flex flex-wrap gap-2 text-xs">
        {CONTENT_NAV.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="rounded-full border border-wabi-border px-3 py-1.5 text-wabi-fg-muted transition hover:border-wabi-fg hover:text-wabi-fg"
          >
            {g.label}
          </a>
        ))}
      </nav>

      <div className="max-w-2xl space-y-16">
        {/* ── 홈 ── */}
        <PageBlock
          id="g-home"
          label="홈"
          note="wasa.kr 첫 화면 — 곡선 위 문구와 맨 아래 버튼."
        >
          <div className="space-y-4">
            <SectionHeading>홈 철학 멘트 (곡선 위 3구절)</SectionHeading>
            <p className="text-xs text-wabi-fg-muted">
              홈 스크롤 중 곡선을 따라 나타나는 문구입니다. 한자(侘·寂·選)와
              라벨은 고정이며, 아래 본문만 편집됩니다.
            </p>
            {pillars.map((p) => (
              <div
                key={p.labelKey}
                className="space-y-3 rounded-lg border border-wabi-border p-4"
              >
                <p className="text-xs font-medium text-wabi-fg">{p.mark}</p>
                <ContentField
                  contentKey={p.labelKey}
                  label="제목"
                  value={p.lv ?? p.dl}
                  rows={1}
                />
                <ContentField
                  contentKey={p.bodyKey}
                  label="본문"
                  value={p.bv ?? p.db}
                  rows={2}
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <SectionHeading>홈 하단 버튼 문구</SectionHeading>
            <ContentField
              contentKey={HOME_CTA_KEY}
              label="Shop 이동 버튼"
              hint="홈 맨 아래 Shop 으로 가는 버튼의 문구입니다."
              value={cta ?? DEFAULT_HOME_CTA}
              rows={2}
            />
          </div>
        </PageBlock>

        {/* ── About(소개) ── */}
        <PageBlock
          id="g-about"
          label="About (소개)"
          note="wasa.kr/about — 소개 문구·매장 사진·고르는 기준."
        >
          <div className="space-y-3">
            <SectionHeading>
              브랜드 소개 문구
              <span className="ml-2 rounded bg-wabi-muted px-1.5 py-0.5 align-middle text-[10px] font-normal text-wabi-fg-muted">
                홈에도 노출
              </span>
            </SectionHeading>
            <ContentField
              contentKey={PHILOSOPHY_KEY}
              label="わび-さび (Wabi-sabi) 소개"
              hint="About 상단·홈 하단에 함께 노출됩니다. 빈 줄(엔터 두 번)로 문단을 구분하세요."
              value={philosophy ?? DEFAULT_PHILOSOPHY}
              rows={12}
            />
          </div>

          <div className="space-y-3">
            <SectionHeading>매장 사진</SectionHeading>
            <p className="text-xs text-wabi-fg-muted">
              About 소개 문단 옆에 표시됩니다. 정사각형으로 잘려 보이니 매장이
              가운데 오도록 올려주세요. 없으면 기본 로고가 표시됩니다.
            </p>
            <AboutImageField current={aboutImage} />
          </div>

          <div className="space-y-4">
            <SectionHeading>고르는 기준</SectionHeading>
            <p className="text-xs text-wabi-fg-muted">
              About 이 섹션의 문구입니다. 섹션 제목·상단 안내문과 세 항목의
              제목·본문을 편집합니다.
            </p>
            <ContentField
              contentKey={CRITERIA_HEADING_KEY}
              label="섹션 제목"
              hint="섹션 맨 위 큰 제목입니다(기본 '고르는 기준')."
              value={critHeading ?? DEFAULT_CRITERIA_HEADING}
              rows={1}
            />
            <ContentField
              contentKey={CRITERIA_SUBTITLE_KEY}
              label="상단 안내문"
              hint="섹션 제목 아래 한 줄 설명입니다."
              value={critSubtitle ?? DEFAULT_CRITERIA_SUBTITLE}
              rows={2}
            />
            {criteria.map((c) => (
              <div
                key={c.label}
                className="space-y-3 rounded-lg border border-wabi-border p-4"
              >
                <p className="text-xs font-medium text-wabi-fg">{c.n}</p>
                <ContentField
                  contentKey={c.label}
                  label="제목"
                  value={c.lv ?? c.dl}
                  rows={1}
                />
                <ContentField
                  contentKey={c.body}
                  label="본문"
                  value={c.bv ?? c.db}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </PageBlock>

        {/* ── 상품 상세 ── */}
        <PageBlock
          id="g-product"
          label="상품 상세"
          note="상품 페이지의 배송 안내·사용 및 관리 문구."
        >
          <div className="space-y-3">
            <SectionHeading>배송 안내</SectionHeading>
            <p className="text-xs text-wabi-fg-muted">
              모든 상품 상세와 교환·환불 안내 페이지에 표시됩니다. 결제 후 실제
              발송까지 걸리는 기간(영업일)을 정확히 적어주세요. 결제 서비스(토스)
              심사에서 확인하는 항목이니 실제 운영에 맞게 꼭 채워주세요.
            </p>
            <ContentField
              contentKey={SHIPPING_INFO_KEY}
              label="배송 소요 안내"
              hint="예: 결제 확인 후 2~5영업일 이내 발송, 주말·공휴일 제외."
              value={shippingInfo ?? DEFAULT_SHIPPING_INFO}
              rows={3}
            />
            <ContentField
              contentKey={SHIPPING_FEE_KEY}
              label="배송비 안내"
              hint="실제 배송비는 8만원 이상 무료·미만 3,500원으로 자동 계산됩니다. 이 칸은 안내 문구(표현)만 바꿉니다 — 금액·기준선을 바꾸려면 개발(시열님)에게 알려주세요."
              value={shippingFee ?? DEFAULT_SHIPPING_FEE}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <SectionHeading>사용 및 관리</SectionHeading>
            <p className="text-xs text-wabi-fg-muted">
              모든 상품 상세의 사진과 리뷰 사이에 표시됩니다. 두 묶음으로 나뉘며,
              각 묶음의 <b>소제목</b>과 <b>본문</b>을 모두 바꿀 수 있습니다(소제목은
              재질별 이름 등으로 자유롭게, 본문은 한 줄에 한 항목씩). 항목마다 개별
              저장하세요.
            </p>
            <div className="space-y-3 rounded-lg border border-wabi-border p-4">
              <ContentField
                contentKey={CARE_USAGE_LABEL_KEY}
                label="첫 번째 소제목"
                hint="상세에 그대로 노출됩니다(기본 '사용'). 예: 'Check (도자기)'."
                value={careUsageLabel ?? DEFAULT_CARE_USAGE_LABEL}
                rows={1}
              />
              <ContentField
                contentKey={CARE_USAGE_KEY}
                label="첫 번째 본문"
                hint="한 줄에 한 항목. 예: 식기세척기·전자레인지 사용 가능, 직화 금지 등."
                value={careUsage ?? DEFAULT_CARE_USAGE}
                rows={6}
              />
            </div>
            <div className="space-y-3 rounded-lg border border-wabi-border p-4">
              <ContentField
                contentKey={CARE_MAINTAIN_LABEL_KEY}
                label="두 번째 소제목"
                hint="상세에 그대로 노출됩니다(기본 '세척과 관리')."
                value={careMaintainLabel ?? DEFAULT_CARE_MAINTAIN_LABEL}
                rows={1}
              />
              <ContentField
                contentKey={CARE_MAINTAIN_KEY}
                label="두 번째 본문"
                hint="한 줄에 한 항목. 예: 사용 후 바로 세척, 색 배임·자연스러운 흔적 등."
                value={careMaintain ?? DEFAULT_CARE_MAINTAIN}
                rows={5}
              />
            </div>
          </div>

        </PageBlock>

        {/* ── 전역 설정 ── */}
        <PageBlock
          id="g-global"
          label="전역 설정"
          note="모든 페이지에 적용 — 정식 오픈 준비중 안내창."
        >
          <section className="space-y-3 rounded-lg border border-wabi-accent/40 bg-wabi-accent/5 p-4">
            <SectionHeading>정식 오픈 준비중 안내</SectionHeading>
            <p className="text-xs text-wabi-fg-muted">
              토스 결제·상품 준비가 끝나기 전, 방문자가 결제를 시도했다 실패하지
              않도록 진입 시 안내창을 띄웁니다. 정식 오픈하면 체크를 해제해
              끄세요.
            </p>
            <PrepNoticeField enabled={prepNotice === "on"} />
            <ContentField
              contentKey={PREP_NOTICE_TEXT_KEY}
              label="안내 문구"
              hint="안내창에 표시될 문장입니다."
              value={prepNoticeText ?? DEFAULT_PREP_NOTICE_TEXT}
              rows={3}
            />
          </section>
        </PageBlock>
      </div>
    </>
  );
}
