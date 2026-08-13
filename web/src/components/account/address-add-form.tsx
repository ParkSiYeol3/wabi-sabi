"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/common/submit-button";
import { PostcodeButton } from "@/components/common/postcode-button";

// 배송지 추가 폼 — 우편번호 검색(다음 위젯)을 붙이려 client 로 분리(#…). server action
// addAddress 는 그대로 form action 으로 넘긴다. 우편번호·주소는 검색 결과를 채워야 해서
// controlled(값을 위젯이 세팅), 나머지는 uncontrolled(name → formData). 상세주소는 직접 입력.

export function AddressAddForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");

  return (
    <form action={action} className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
      {/* placeholder 는 접근 가능한 이름이 아니다(입력하면 사라진다) → aria-label 병기 */}
      <Input
        name="recipient"
        required
        aria-label="받는 분"
        placeholder="받는 분"
        className="rounded-none"
      />
      <Input
        name="phone"
        required
        aria-label="연락처"
        placeholder="연락처"
        className="rounded-none font-numeric"
      />
      <div className="flex gap-2">
        <Input
          name="postcode"
          aria-label="우편번호"
          placeholder="우편번호"
          className="rounded-none font-numeric"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
        />
        <PostcodeButton
          onComplete={(r) => {
            setPostcode(r.zonecode);
            setAddress(r.address);
          }}
        />
      </div>
      <Input
        name="address"
        required
        aria-label="주소"
        placeholder="주소"
        className="rounded-none font-numeric"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Input
        name="detail"
        aria-label="상세주소"
        placeholder="상세주소"
        className="rounded-none font-numeric sm:col-span-2"
      />
      <SubmitButton
        styled
        pendingText="추가 중…"
        className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 sm:col-span-2"
      >
        배송지 추가
      </SubmitButton>
    </form>
  );
}
