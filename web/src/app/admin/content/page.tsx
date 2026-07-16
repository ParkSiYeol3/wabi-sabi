import { Button } from "@/components/ui/button";
import {
  getSiteContent,
  PHILOSOPHY_KEY,
  DEFAULT_PHILOSOPHY,
} from "@/lib/queries/content";
import { saveContent } from "./actions";

export default async function AdminContentPage() {
  const philosophy = (await getSiteContent(PHILOSOPHY_KEY)) ?? DEFAULT_PHILOSOPHY;

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-medium">사이트 콘텐츠</h2>

      <form action={saveContent} className="max-w-2xl space-y-3">
        <input type="hidden" name="key" value={PHILOSOPHY_KEY} />
        <div>
          <label htmlFor="philosophy" className="block text-sm font-medium">
わび-さび (Wabi-sabi) 소개 문구
          </label>
          <p className="mt-1 text-xs text-wabi-fg-muted">
            홈·About 페이지에 노출됩니다. 빈 줄(엔터 두 번)로 문단을 구분하세요.
          </p>
        </div>
        <textarea
          id="philosophy"
          name="value"
          defaultValue={philosophy}
          rows={14}
          required
          className="w-full border border-wabi-border bg-transparent p-3 text-sm leading-7"
        />
        <Button
          type="submit"
          className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90"
        >
          저장
        </Button>
      </form>
    </div>
  );
}
