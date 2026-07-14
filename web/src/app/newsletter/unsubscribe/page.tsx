import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "뉴스레터 수신거부", robots: { index: false } };

// 뉴스레터 구독취소 (#116) — 정보통신망법 §50: 광고성 정보엔 수신거부 수단이 필수.
// 메일 수신자는 로그인 상태가 아니므로 토큰 링크만으로 해지된다(0019).
// 이메일을 링크에 넣으면 남의 주소로 임의 해지가 가능해 추측 불가 토큰을 쓴다.
//
// GET 으로 처리하는 이유: 메일 클라이언트에서 링크 클릭 = GET 이고, 이 동작은
// 사용자에게 유리한 방향(수신 중단)이라 프리페치로 실행돼도 피해가 없다.
// 되돌리려면 다시 구독하면 된다.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const parsed = uuidSchema.safeParse(token ?? "");

  let status: "done" | "invalid" | "error" = "invalid";

  if (parsed.success && adminConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", parsed.data)
      .select("id");

    if (error) {
      console.error("[unsubscribe] 실패", error);
      status = "error";
    } else {
      // 이미 해지된 구독도 update 는 성공한다(멱등) — 행이 0개면 잘못된 토큰.
      status = data && data.length > 0 ? "done" : "invalid";
    }
  } else if (parsed.success && !adminConfigured()) {
    status = "error";
  }

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">뉴스레터 수신거부</h1>

        {status === "done" && (
          <p className="mt-4 text-sm text-wabi-fg-muted">
            수신거부가 완료되었습니다. 앞으로 뉴스레터를 보내지 않습니다.
          </p>
        )}
        {status === "invalid" && (
          <p className="mt-4 text-sm text-wabi-fg-muted">
            유효하지 않은 링크입니다. 이미 수신거부되었거나 링크가 잘못되었을 수
            있습니다.
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-sm text-wabi-fg-muted">
            일시적인 오류로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        <Link
          href="/"
          className="mt-8 inline-block text-sm underline underline-offset-4 hover:text-wabi-fg"
        >
          홈으로
        </Link>
      </div>
    </Container>
  );
}
