import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SubmitButton } from "@/components/common/submit-button";
import { LogoutButton } from "@/components/account/logout-button";
import { DeleteAccountSection } from "@/components/account/delete-account-section";
import { NicknameForm } from "@/components/account/nickname-form";
import { AddressAddForm } from "@/components/account/address-add-form";
import { LinkedAccounts } from "@/components/account/linked-accounts";
import { MyCoupons } from "@/components/account/my-coupons";
import { MarketingConsentToggle } from "@/components/account/marketing-consent-toggle";
import {
  RecentOrders,
  type RecentOrder,
} from "@/components/account/recent-orders";
import { ReviewPrompt } from "@/components/account/review-prompt";
import { getMarketingConsent } from "@/lib/queries/consent";
import { getPendingReviews } from "@/lib/queries/pending-reviews";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addAddress, deleteAddress } from "./actions";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "마이페이지" };

type Address = {
  id: string;
  recipient: string;
  phone: string;
  postcode: string | null;
  address: string;
  detail: string | null;
};

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ link_error?: string }>;
}) {
  // 소셜 연결이 콜백에서 실패해 돌아온 경우(?link_error=1) 안내를 띄운다.
  const linkError = (await searchParams).link_error === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/mypage");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, recipient, phone, postcode, address, detail")
    .order("created_at", { ascending: false })
    .returns<Address[]>();

  // 최근 주문 3건(#754). 미결제(pending)는 주문 내역과 같은 기준으로 숨긴다.
  const { data: recentOrders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, preparing_at, tracking_number, courier, ordered_at, order_items(product_name, price, quantity, products(images))",
    )
    .eq("user_id", user.id)
    .neq("status", "pending")
    .order("ordered_at", { ascending: false })
    .limit(3)
    .returns<RecentOrder[]>();

  // 마케팅 수신 동의 현재 상태(#671) — 이력의 최신 행. 기록이 없으면 미동의.
  const marketingConsent = await getMarketingConsent(user.id);

  // 리뷰 안 쓴 배송완료 상품(#919). 있으면 주문·배송 위에 안내, 다 쓰면 사라진다.
  const pendingReviews = await getPendingReviews(supabase, user.id);

  // 소셜 연결 상태 — identity 목록(email·google·kakao)을 서버에서 조회해 LinkedAccounts
  // 초기값으로 넘긴다(클라 effect 없이 SSR 초기 렌더). 세션 기반 getUserIdentities 는
  // 서버(@supabase/ssr)에서 identities 를 비워 돌려줘 이미 연결된 소셜이 "연결 안 됨"으로
  // 보였다 → service_role admin.getUserById 로 확실히 채운 identity 목록을 쓴다.
  const { data: full } = await createAdminClient().auth.admin.getUserById(user.id);
  const identities_ = full.user?.identities ?? [];

  return (
    <Container className="py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-wide">마이페이지</h1>
        <LogoutButton />
      </div>

      {/* 내 정보 */}
      <section className="mt-12">
        <h2 className="text-lg font-medium">내 정보</h2>
        <div className="mt-4 space-y-1 text-sm text-wabi-fg-muted">
          <p className="font-numeric">이메일: {profile?.email ?? user.email}</p>
        </div>
        <NicknameForm defaultName={profile?.name ?? ""} />
      </section>

      {/* 소식 받기 — 마케팅 수신 동의(#671). 켜고 끌 때마다 동의·철회 이력이 남는다 */}
      <section className="mt-14">
        <h2 className="text-lg font-medium">소식 받기</h2>
        <div className="mt-4">
          <MarketingConsentToggle initial={marketingConsent} />
        </div>
      </section>

      {/* 주문·배송(#754). 첫 실주문 때 마이페이지에서 주문 내역·배송조회로 가는 길이
          없었다(헤더 아이콘·모바일 메뉴뿐). 맨 위는 과하다(시열님 10/3) → 배송지 바로 위. */}
      <ReviewPrompt items={pendingReviews} />
      <RecentOrders orders={recentOrders ?? []} />

      {/* 위시리스트. 헤더 하트는 1024px 부터, 휴대폰은 메뉴 안이라 태블릿(768~1023px)에서
          가는 길이 없었다(CodeRabbit #911). 주문·배송과 같은 모양의 바로가기. */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">위시리스트</h2>
          <Link
            href="/mypage/wishlist"
            className="text-sm text-wabi-fg-muted underline-offset-4 transition-colors hover:text-wabi-fg hover:underline"
          >
            위시리스트 보기 →
          </Link>
        </div>
      </section>

      {/* 배송지 */}
      <section className="mt-14">
        <h2 className="text-lg font-medium">배송지</h2>

        {addresses && addresses.length > 0 ? (
          <ul className="mt-4 divide-y divide-wabi-border border-y border-wabi-border">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between py-4">
                <div className="text-sm">
                  <p className="font-medium">
                    {a.recipient}{" "}
                    <span className="font-numeric text-wabi-fg-muted">
                      {formatPhone(a.phone)}
                    </span>
                  </p>
                  <p className="mt-1 font-numeric text-wabi-fg-muted">
                    {a.postcode ? `(${a.postcode}) ` : ""}
                    {a.address} {a.detail}
                  </p>
                </div>
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton
                    pendingText="…"
                    aria-label="배송지 삭제"
                    className="flex size-11 cursor-pointer items-center justify-center text-wabi-fg-muted hover:text-wabi-fg"
                  >
                    <Trash2 className="size-4" />
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-wabi-fg-muted">
            등록된 배송지가 없습니다.
          </p>
        )}

        {/* 배송지 추가 — 우편번호 검색 위해 client 폼으로 분리 */}
        <AddressAddForm action={addAddress} />
      </section>

      {/* 소셜 계정 연결/해제 — identity 목록은 서버에서 조회해 초기값으로 전달 */}
      <MyCoupons />

      <LinkedAccounts initialIdentities={identities_ ?? []} linkError={linkError} />

      <DeleteAccountSection />
    </Container>
  );
}
