import { AtSign, ImageIcon } from "lucide-react";
import { site } from "@/lib/site";

// WSB-020~022: 인스타그램 피드 (현재 플레이스홀더 — 추후 IG Graph API/임베드 연동).
export function InstagramFeed() {
  return (
    <section className="bg-wabi-subtle">
      <div className="mx-auto max-w-300 px-5 py-20 text-center">
        <h2 className="text-xl font-semibold">Instagram</h2>
        <a
          href={site.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm text-wabi-fg-muted hover:text-wabi-fg"
        >
          <AtSign className="size-4" strokeWidth={1.5} />
          {site.instagram}
        </a>

        <ul className="mt-8 grid grid-cols-3 gap-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`인스타그램 게시물 ${i + 1}`}
                className="flex aspect-square items-center justify-center bg-wabi-muted transition-opacity hover:opacity-80"
              >
                <ImageIcon
                  className="size-6 text-wabi-fg-muted/40"
                  strokeWidth={1}
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
