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
  addonImageKey,
} from "@/lib/queries/content";
import { ADDONS, won } from "@/lib/addons";
import { PageHeader, SectionHeading } from "@/components/admin/ui";
import { ContentField } from "@/components/admin/content-field";
import { AboutImageField } from "@/components/admin/about-image-field";
import { AddonImageField } from "@/components/admin/addon-image-field";

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
    ...addonImages
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
    ...ADDONS.map((a) => getSiteContent(addonImageKey(a.code))),
  ]);

  return (
    <>
      <PageHeader
        title="사이트 콘텐츠"
        description="홈·About에 노출되는 텍스트를 직접 편집합니다. 항목별로 저장하세요."
      />

      <div className="max-w-2xl space-y-12">
        {/* 소개 문구 — 홈·About 공용 */}
        <section className="space-y-3">
          <SectionHeading>브랜드 소개 문구</SectionHeading>
          <ContentField
            contentKey={PHILOSOPHY_KEY}
            label="わび-さび (Wabi-sabi) 소개"
            hint="홈·About 페이지에 노출됩니다. 빈 줄(엔터 두 번)로 문단을 구분하세요."
            value={philosophy ?? DEFAULT_PHILOSOPHY}
            rows={12}
          />
        </section>

        {/* About 매장 사진 — 소개 문단 옆 이미지 */}
        <section className="space-y-3">
          <SectionHeading>About 매장 사진</SectionHeading>
          <p className="text-xs text-wabi-fg-muted">
            About 소개 문단 옆에 표시됩니다. 정사각형으로 잘려 보이니 매장이
            가운데 오도록 올려주세요. 없으면 기본 로고가 표시됩니다.
          </p>
          <AboutImageField current={aboutImage} />
        </section>

        {/* 추가 옵션 사진 — 상품 상세의 선물 포장·쇼핑백 옵션 옆에 표시 */}
        <section className="space-y-3">
          <SectionHeading>추가 옵션 사진</SectionHeading>
          <p className="text-xs text-wabi-fg-muted">
            상품 상세의 &ldquo;추가 옵션&rdquo;(선물 포장·쇼핑백) 옆에 작은
            사진으로 표시됩니다. 정사각형으로 잘려 보이니 가운데 오도록
            올려주세요. 없으면 사진 자리만 표시됩니다.
          </p>
          <div className="space-y-3">
            {ADDONS.map((a, i) => (
              <AddonImageField
                key={a.code}
                code={a.code}
                label={`${a.name} (+${won(a.price)})`}
                current={addonImages[i] ?? null}
              />
            ))}
          </div>
        </section>

        {/* 홈 철학 3주(侘·寂·選) — 곡선 여정에 등장하는 본문. 한자·라벨은 고정. */}
        <section className="space-y-4">
          <SectionHeading>홈 철학 멘트 (곡선 위 3구절)</SectionHeading>
          <p className="text-xs text-wabi-fg-muted">
            홈 스크롤 중 곡선을 따라 나타나는 문구입니다. 한자(侘·寂·選)와
            라벨은 고정이며, 아래 본문만 편집됩니다.
          </p>
          <div className="space-y-3 rounded-lg border border-wabi-border p-4">
            <p className="text-xs font-medium text-wabi-fg">侘 (첫 번째)</p>
            <ContentField
              contentKey={HOME_PILLAR_LABEL_KEYS[0]}
              label="제목"
              value={wabiLabel ?? DEFAULT_PILLAR_LABELS.home_pillar_wabi_label}
              rows={1}
            />
            <ContentField
              contentKey={HOME_PILLAR_KEYS[0]}
              label="본문"
              value={wabi ?? DEFAULT_PILLARS.home_pillar_wabi}
              rows={2}
            />
          </div>
          <div className="space-y-3 rounded-lg border border-wabi-border p-4">
            <p className="text-xs font-medium text-wabi-fg">寂 (두 번째)</p>
            <ContentField
              contentKey={HOME_PILLAR_LABEL_KEYS[1]}
              label="제목"
              value={sabiLabel ?? DEFAULT_PILLAR_LABELS.home_pillar_sabi_label}
              rows={1}
            />
            <ContentField
              contentKey={HOME_PILLAR_KEYS[1]}
              label="본문"
              value={sabi ?? DEFAULT_PILLARS.home_pillar_sabi}
              rows={2}
            />
          </div>
          <div className="space-y-3 rounded-lg border border-wabi-border p-4">
            <p className="text-xs font-medium text-wabi-fg">選 (세 번째)</p>
            <ContentField
              contentKey={HOME_PILLAR_LABEL_KEYS[2]}
              label="제목"
              value={
                selectLabel ?? DEFAULT_PILLAR_LABELS.home_pillar_select_label
              }
              rows={1}
            />
            <ContentField
              contentKey={HOME_PILLAR_KEYS[2]}
              label="본문"
              value={select ?? DEFAULT_PILLARS.home_pillar_select}
              rows={2}
            />
          </div>
        </section>

        {/* 홈 하단 CTA — Shop 으로 유도하는 문구 */}
        <section className="space-y-3">
          <SectionHeading>홈 하단 버튼 문구</SectionHeading>
          <ContentField
            contentKey={HOME_CTA_KEY}
            label="Shop 이동 버튼"
            hint="홈 맨 아래 Shop 으로 가는 버튼의 문구입니다."
            value={cta ?? DEFAULT_HOME_CTA}
            rows={2}
          />
        </section>
      </div>
    </>
  );
}
