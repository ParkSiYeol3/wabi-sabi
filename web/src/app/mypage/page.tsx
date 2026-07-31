import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Container } from "@/components/container";
import { SubmitButton } from "@/components/submit-button";
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
          <p className="font-numeric">이메일: {profile?.email ?? user.email}</p>
        </div>
        <form action={updateName} className="mt-4 max-w-sm">
          <label
            htmlFor="mypage-nickname"
            className="text-sm font-medium text-wabi-fg"
          >
            닉네임
          </label>
          <p className="mt-0.5 font-numeric text-xs text-wabi-fg-muted">
            커뮤니티·리뷰에 표시됩니다 · 2~20자
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              id="mypage-nickname"
              name="name"
              defaultValue={profile?.name ?? ""}
              placeholder="닉네임"
              aria-label="닉네임"
              minLength={2}
              maxLength={20}
              className="rounded-none"
            />
            <SubmitButton
              styled
              pendingText="저장 중…"
              className="rounded-none bg-wabi-accent px-6 hover:bg-wabi-accent/90"
            >
              저장
            </SubmitButton>
          </div>
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
                    <span className="font-numeric text-wabi-fg-muted">
                      {a.phone}
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
          <SubmitButton
            styled
            pendingText="추가 중…"
            className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 sm:col-span-2"
          >
            배송지 추가
          </SubmitButton>
        </form>
      </section>

      <DeleteAccountSection />
    </Container>
  );
}
