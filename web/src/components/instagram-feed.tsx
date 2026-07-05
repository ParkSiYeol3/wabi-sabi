import Image from "next/image";
import { AtSign, ImageIcon } from "lucide-react";
import { site } from "@/lib/site";
import { fetchInstagramPosts } from "@/lib/instagram";

// WSB-020~022: 인스타그램 피드 — IG Graph API 연동(서버 컴포넌트).
// 토큰 미설정·호출 실패 시 플레이스홀더 그리드 폴백 (lib/instagram.ts 참고).
export async function InstagramFeed() {
  const posts = await fetchInstagramPosts(6);

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
          {posts
            ? posts.map((post) => (
                <li key={post.id}>
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-square overflow-hidden bg-wabi-muted transition-opacity hover:opacity-80"
                  >
                    <Image
                      src={post.mediaUrl}
                      alt={post.caption?.slice(0, 80) ?? "인스타그램 게시물"}
                      fill
                      sizes="(min-width: 768px) 16vw, 33vw"
                      className="object-cover"
                    />
                  </a>
                </li>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
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
