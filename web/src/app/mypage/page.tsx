import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoutButton } from "@/components/logout-button";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { createClient } from "@/lib/supabase/server";
import { updateName, addAddress, deleteAddress } from "./actions";

export const metadata: Metadata = { title: "마이페이지" };

type Address = {
  id: string;
  recipient: string;
  phone: string;
  postcode: string | null;
  address: string;
  detail: string | null;
};

export default async function MyPage() {
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
          <p>이메일: {profile?.email ?? user.email}</p>
        </div>
        <form action={updateName} className="mt-4 flex max-w-sm gap-2">
          <Input
            name="name"
            defaultValue={profile?.name ?? ""}
            placeholder="이름"
            aria-label="이름"
            className="rounded-none"
          />
          <Button
            type="submit"
            className="rounded-none bg-wabi-accent px-6 hover:bg-wabi-accent/90"
          >
            저장
          </Button>
        </form>
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
                    <span className="text-wabi-fg-muted">{a.phone}</span>
                  </p>
                  <p className="mt-1 text-wabi-fg-muted">
                    {a.postcode ? `(${a.postcode}) ` : ""}
                    {a.address} {a.detail}
                  </p>
                </div>
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    aria-label="배송지 삭제"
                    className="p-2 text-wabi-fg-muted hover:text-wabi-fg"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-wabi-fg-muted">
            등록된 배송지가 없습니다.
          </p>
        )}

        {/* 배송지 추가 */}
        <form
          action={addAddress}
          className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2"
        >
          {/* placeholder 는 접근 가능한 이름이 아니다(입력하면 사라진다) → aria-label 병기 */}
          <Input name="recipient" required aria-label="받는 분" placeholder="받는 분" className="rounded-none" />
          <Input name="phone" required aria-label="연락처" placeholder="연락처" className="rounded-none" />
          <Input name="postcode" aria-label="우편번호" placeholder="우편번호" className="rounded-none" />
          <Input name="address" required aria-label="주소" placeholder="주소" className="rounded-none" />
          <Input
            name="detail"
            aria-label="상세주소"
            placeholder="상세주소"
            className="rounded-none sm:col-span-2"
          />
          <Button
            type="submit"
            className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 sm:col-span-2"
          >
            배송지 추가
          </Button>
        </form>
      </section>

      {/* 바로가기 */}
      <section className="mt-14 flex gap-4 text-sm">
        <Link
          href="/mypage/orders"
          className="text-wabi-fg-muted hover:text-wabi-fg"
        >
          주문 내역 →
        </Link>
        <Link
          href="/mypage/wishlist"
          className="text-wabi-fg-muted hover:text-wabi-fg"
        >
          위시리스트 →
        </Link>
      </section>

      <DeleteAccountSection />
    </Container>
  );
}
