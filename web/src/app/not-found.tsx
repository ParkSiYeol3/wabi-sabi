import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-32 text-center">
      {/* 한자(侘) 한 글자는 브랜드 어원을 아는 사람만 읽혀 "왜 한자?" 혼란(대표님).
          해독이 필요 없는 브랜드 로고(마크+WABI SABI)로 교체 — 뜻 몰라도 브랜드로 인식. */}
      <Image
        src="/brand/logo-stacked.png"
        alt="WABI-SABI"
        width={640}
        height={554}
        priority
        className="h-28 w-auto opacity-90 md:h-32"
      />
      <h1 className="mt-8 text-2xl font-semibold">404</h1>
      <p className="mt-3 text-sm text-wabi-fg-muted">
        찾으시는 페이지가 없습니다.
      </p>
      <Button
        asChild
        className="mt-10 rounded-none bg-wabi-accent px-8 hover:bg-wabi-accent/90"
      >
        <Link href="/">홈으로</Link>
      </Button>
    </Container>
  );
}
