import type { Metadata } from "next";
import { LegalPage, Article } from "@/components/legal-layout";
import { business, site } from "@/lib/site";

export const metadata: Metadata = { title: "이용약관" };

// ⚠ 초안 — 대표님 확인 및 필요 시 법률 검토 후 확정할 것 (#106).
// 실제 서비스 동작(토스페이먼츠 결제·배송 전 취소·상품당 1인 1리뷰 등)에 맞춰 작성했다.
export default function TermsPage() {
  return (
    <LegalPage title="이용약관" effectiveDate="2026년 7월 13일">
      <Article heading="제1조 (목적)">
        <p>
          본 약관은 {business.companyName}(이하 &ldquo;회사&rdquo;)가 운영하는
          온라인 스토어 {site.name}(wasa.kr, 이하 &ldquo;몰&rdquo;)에서 제공하는
          서비스의 이용 조건과 절차, 회사와 이용자의 권리·의무 및 책임사항을
          정함을 목적으로 합니다.
        </p>
      </Article>

      <Article heading="제2조 (회원가입 및 계정)">
        <p>
          이용자는 이메일 주소와 비밀번호를 등록하거나 소셜 로그인(카카오·구글)을
          통해 회원으로 가입할 수 있습니다. 회원은 계정 정보를 타인에게 양도하거나
          대여할 수 없으며, 계정 관리 소홀로 발생한 손해에 대해 책임을 집니다.
        </p>
        <p>
          회원은 마이페이지에서 언제든지 회원 정보를 수정하거나 탈퇴할 수 있습니다.
        </p>
      </Article>

      <Article heading="제3조 (주문 및 결제)">
        <p>
          이용자는 몰에 게시된 상품을 장바구니에 담아 주문할 수 있으며, 결제는
          토스페이먼츠를 통해 처리됩니다. 결제 승인 시점의 상품 가격과 재고를
          기준으로 주문이 확정되며, 재고가 부족한 경우 주문은 자동으로 취소되고
          결제 금액은 전액 환불됩니다.
        </p>
        <p>
          미결제 상태로 24시간이 경과한 주문은 자동으로 취소될 수 있습니다.
        </p>
      </Article>

      <Article heading="제4조 (청약철회 및 환불)">
        <p>
          청약철회·교환·환불에 관한 사항은{" "}
          <a href="/legal/refund" className="underline hover:text-wabi-fg">
            교환·환불 안내
          </a>
          에서 정한 바에 따릅니다.
        </p>
      </Article>

      <Article heading="제5조 (게시물)">
        <p>
          회원은 상품 리뷰(구매 상품당 1건)와 문의를 작성할 수 있습니다. 다음에
          해당하는 게시물은 사전 통지 없이 삭제될 수 있습니다.
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>타인을 비방하거나 명예를 훼손하는 내용</li>
          <li>상품과 무관한 광고·홍보성 내용</li>
          <li>타인의 저작권 등 권리를 침해하는 내용</li>
          <li>동일·유사 내용의 반복 게시</li>
        </ul>
        <p>
          회원이 작성한 게시물의 저작권은 작성자에게 있으며, 회사는 몰 내에서의
          노출을 위해 이를 사용할 수 있습니다.
        </p>
      </Article>

      <Article heading="제6조 (회사의 의무)">
        <p>
          회사는 안정적인 서비스 제공을 위해 노력하며, 이용자의 개인정보를{" "}
          <a href="/legal/privacy" className="underline hover:text-wabi-fg">
            개인정보처리방침
          </a>
          에 따라 보호합니다.
        </p>
      </Article>

      <Article heading="제7조 (면책)">
        <p>
          천재지변, 정전, 통신 장애 등 회사의 합리적 통제를 벗어난 사유로 서비스를
          제공할 수 없는 경우 회사는 책임을 지지 않습니다. 수공예품의 특성상
          색상·질감·크기에 개체별 미세한 차이가 있을 수 있으며, 이는 하자에
          해당하지 않습니다.
        </p>
      </Article>

      <Article heading="제8조 (약관의 변경)">
        <p>
          회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며,
          변경 시 몰의 공지사항을 통해 시행일 7일 전(회원에게 불리한 변경은 30일
          전)부터 공지합니다.
        </p>
      </Article>

      <Article heading="제9조 (문의처)">
        <p>
          본 약관에 관한 문의는 {business.email} 또는 몰의 문의 게시판으로
          연락해 주시기 바랍니다.
        </p>
      </Article>
    </LegalPage>
  );
}
