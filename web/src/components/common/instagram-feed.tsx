import Image from "next/image";
import { AtSign, ImageIcon } from "lucide-react";
import { site } from "@/lib/site";
import { fetchInstagramPosts } from "@/lib/instagram";

// WSB-020~022: Instagram 피드 — IG Graph API 연동(서버 컴포넌트).
// 대표님: 피드가 레일처럼 계속 옆으로 흐르길 원함 → 자동 가로 마퀴(CSS .ig-rail).
// 게시물을 2벌 이어붙여 이음매 없이 무한 반복(hover 시 정지). 토큰 미설정·실패
// 시 정적 플레이스홀더 그리드로 폴백(lib/instagram.ts 참고).
export async function InstagramFeed() {
  const posts = await fetchInstagramPosts(12);

  return (
    <section className="overflow-hidden bg-wabi-subtle pb-10 pt-16">
      <div className="mx-auto max-w-300 px-5 text-center">
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
      </div>

      {posts ? (
        // 레일 — 전체 폭으로 흐른다(블리드). 2벌 이어붙여 무한 순환.
        <ul className="ig-rail mt-10 flex w-max">
          {[...posts, ...posts].map((post, i) => {
            const dup = i >= posts.length;
            return (
              <li
                key={`${post.id}-${i}`}
                aria-hidden={dup || undefined}
                className="mr-3 w-44 shrink-0 md:w-56"
              >
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={dup ? -1 : undefined}
                  className="relative block aspect-square overflow-hidden bg-wabi-muted transition-opacity hover:opacity-80"
                >
                  <Image
                    src={post.mediaUrl}
                    alt={post.caption?.slice(0, 80) ?? "Instagram post"}
                    fill
                    sizes="(min-width: 768px) 224px, 176px"
                    className="object-cover"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mx-auto mt-10 max-w-300 px-5">
          <ul className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram post ${i + 1}`}
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
      )}
    </section>
  );
}
