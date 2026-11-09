import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { verifyUnsubscribe } from "@/lib/unsubscribe";
import { unsubscribe } from "./actions";

// 광고 메일 수신거부(#919). 메일의 [수신거부] 링크가 여기로 온다. 정보통신망법(KISA
// 안내서)대로 로그인 없이, 한글·영문으로 묻고 한 번 누르면 끝난다. 링크를 여는 것만으로
// 거부되지 않게 확인 버튼을 둔다(메일 보안 검사기가 링크를 미리 열어 보는 경우가 있다).

export const metadata: Metadata = {
  title: "수신거부",
  robots: { index: false, follow: false },
};

type SP = { u?: string; t?: string; state?: string };

const MYPAGE_HINT = "마이페이지의 ‘소식 받기’에서도 켜고 끌 수 있습니다.";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  let title: string;
  let titleEn: string;
  let body: React.ReactNode;

  if (sp.state === "done") {
    title = "수신거부되었습니다";
    titleEn = "You have been unsubscribed.";
    body = (
      <p>
        와비사비 광고 메일을 더 보내지 않습니다. 주문·배송 안내 메일은 그대로 발송됩니다.
        다시 받으시려면 마이페이지의 &lsquo;소식 받기&rsquo;에서 켜 주세요.
      </p>
    );
  } else if (sp.state === "error") {
    title = "처리하지 못했습니다";
    titleEn = "Something went wrong. Please try again.";
    body = (
      <p>
        잠시 후 메일의 수신거부 링크를 다시 눌러 주세요. {MYPAGE_HINT}
      </p>
    );
  } else if (!verifyUnsubscribe(sp.u, sp.t)) {
    title = "링크가 올바르지 않습니다";
    titleEn = "This link is invalid or has expired.";
    body = <p>메일에 있는 수신거부 링크를 그대로 눌러 주세요. {MYPAGE_HINT}</p>;
  } else {
    title = "와비사비 광고 메일을 더 받지 않으시겠습니까?";
    titleEn = "Unsubscribe from WABI-SABI promotional emails?";
    body = (
      <form action={unsubscribe} className="space-y-4">
        <input type="hidden" name="u" value={sp.u} />
        <input type="hidden" name="t" value={sp.t} />
        <p>주문·배송 안내 메일은 수신거부와 상관없이 계속 발송됩니다.</p>
        <Button type="submit" className="rounded-none">
          수신거부 · Unsubscribe
        </Button>
      </form>
    );
  }

  return (
    <Container className="max-w-xl py-20">
      <h1 className="text-xl font-semibold text-balance break-keep text-wabi-fg">{title}</h1>
      <p lang="en" className="mt-2 text-sm text-wabi-fg-muted">
        {titleEn}
      </p>
      <div className="mt-8 text-sm leading-relaxed break-keep text-wabi-fg-muted">{body}</div>
      <Link
        href="/"
        className="mt-12 inline-block text-sm text-wabi-fg-muted underline-offset-4 hover:text-wabi-fg hover:underline"
      >
        와비사비 홈으로
      </Link>
    </Container>
  );
}
