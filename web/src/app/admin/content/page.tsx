import { Button } from "@/components/ui/button";
import {
  getSiteContent,
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
  HOME_PILLAR_KEYS,
  DEFAULT_PILLARS,
  HOME_CTA_KEY,
  DEFAULT_HOME_CTA,
  type ContentKey,
} from "@/lib/queries/content";
import { PageHeader, SectionHeading } from "@/components/admin/ui";
import { saveContent } from "./actions";

// 편집 가능한 텍스트 한 칸 — 개별 form(단일 key upsert). 라벨·설명·현재값·행수.
function ContentField({
  contentKey,
  label,
  hint,
  value,
  rows,
}: {
  contentKey: ContentKey;
  label: string;
  hint?: string;
  value: string;
  rows: number;
}) {
  return (
    <form action={saveContent} className="space-y-2">
      <input type="hidden" name="key" value={contentKey} />
      <div>
        <label htmlFor={contentKey} className="block text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-1 text-xs text-wabi-fg-muted">{hint}</p>}
      </div>
      <textarea
        id={contentKey}
        name="value"
        defaultValue={value}
        rows={rows}
        required
        maxLength={5000}
        className="w-full rounded-lg border border-wabi-border bg-wabi-bg/60 p-3 text-sm leading-7 outline-none transition-colors focus:border-wabi-fg"
      />
      <Button
        type="submit"
        className="rounded-lg bg-wabi-accent hover:bg-wabi-accent/90"
      >
        저장
      </Button>
    </form>
  );
}

export default async function AdminContentPage() {
  // 각 편집 값(미저장이면 기본 문구). 병렬 조회.
  const [philosophy, wabi, sabi, select, cta] = await Promise.all([
    getSiteContent(PHILOSOPHY_KEY),
    getSiteContent(HOME_PILLAR_KEYS[0]),
    getSiteContent(HOME_PILLAR_KEYS[1]),
    getSiteContent(HOME_PILLAR_KEYS[2]),
    getSiteContent(HOME_CTA_KEY),
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

        {/* 홈 철학 3주(侘·寂·選) — 곡선 여정에 등장하는 본문. 한자·라벨은 고정. */}
        <section className="space-y-4">
          <SectionHeading>홈 철학 멘트 (곡선 위 3구절)</SectionHeading>
          <p className="text-xs text-wabi-fg-muted">
            홈 스크롤 중 곡선을 따라 나타나는 문구입니다. 한자(侘·寂·選)와
            라벨은 고정이며, 아래 본문만 편집됩니다.
          </p>
          <ContentField
            contentKey={HOME_PILLAR_KEYS[0]}
            label="侘 · 와비 / WABI"
            value={wabi ?? DEFAULT_PILLARS.home_pillar_wabi}
            rows={2}
          />
          <ContentField
            contentKey={HOME_PILLAR_KEYS[1]}
            label="寂 · 사비 / SABI"
            value={sabi ?? DEFAULT_PILLARS.home_pillar_sabi}
            rows={2}
          />
          <ContentField
            contentKey={HOME_PILLAR_KEYS[2]}
            label="選 · 큐레이션 / SELECT"
            value={select ?? DEFAULT_PILLARS.home_pillar_select}
            rows={2}
          />
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
