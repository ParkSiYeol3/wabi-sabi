import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { getNotices } from "@/lib/queries/notices";

export const metadata: Metadata = {
  title: "공지사항",
  description: "WABI-SABI 공지사항",
};

// 쿠키·searchParams 를 안 읽어 기본값이면 빌드 타임 정적 프리렌더 대상이 되는데,
// 그러면 빌드 중 Supabase 에 접근한다(CI엔 공개 env 미주입 → 빌드 실패, 프로덕션에도
// 빌드가 DB 가용성에 의존). 홈·상세처럼 요청 시 렌더하되 getNotices 는 unstable_cache
// 로 캐시되므로 DB 왕복은 그대로 제거된다.
export const dynamic = "force-dynamic";

export default async function NoticeListPage() {
  const notices = await getNotices();

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">공지사항</h1>

      {notices.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          등록된 공지가 없습니다.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-wabi-border border-y border-wabi-border">
          {notices.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notice/${n.id}`}
                className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-wabi-accent"
              >
                <span className="text-sm">{n.title}</span>
                <time className="shrink-0 text-xs text-wabi-fg-muted">
                  {new Date(n.created_at).toLocaleDateString("ko-KR")}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
