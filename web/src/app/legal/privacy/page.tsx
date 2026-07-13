import type { Metadata } from "next";
import { LegalPage, Article } from "@/components/legal-layout";
import { business } from "@/lib/site";

export const metadata: Metadata = { title: "개인정보처리방침" };

// ⚠ 초안 — 대표님 확인 및 필요 시 법률 검토 후 확정할 것 (#106).
// 수집 항목·위탁사는 실제 구현 기준으로 작성했다(추측 금지):
//  - 계정: Supabase Auth(이메일·비밀번호 해시·소셜 로그인 식별자)
//  - 프로필/주문: profiles·orders·order_items·addresses·cart_items·wishlist
//  - 결제: 토스페이먼츠 (카드정보는 회사가 보관하지 않음)
//  - 로그: client_error_log(에러 메시지·URL·User-Agent), admin_audit_logs
// 항목이 바뀌면 이 문서도 함께 고칠 것.
export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침" effectiveDate="2026년 7월 13일">
      <Article heading="1. 수집하는 개인정보 항목">
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong className="text-wabi-fg">회원가입</strong> — 이메일 주소,
            비밀번호, 이름. 소셜 로그인(카카오·구글) 이용 시 해당 서비스가 제공하는
            계정 식별자와 이메일
          </li>
          <li>
            <strong className="text-wabi-fg">주문·배송</strong> — 수령인 이름,
            연락처, 배송지 주소, 배송 요청사항, 주문 내역
          </li>
          <li>
            <strong className="text-wabi-fg">결제</strong> — 결제 수단 및 결제
            승인 정보. <strong className="text-wabi-fg">카드번호 등 결제
            수단의 상세 정보는 결제대행사(토스페이먼츠)가 처리하며 회사는 보관하지
            않습니다.</strong>
          </li>
          <li>
            <strong className="text-wabi-fg">서비스 이용 과정에서 자동 수집</strong>{" "}
            — 접속 브라우저 정보(User-Agent), 오류 발생 시 오류 메시지와 해당 페이지
            주소(서비스 안정성 개선 목적)
          </li>
        </ul>
      </Article>

      <Article heading="2. 개인정보의 이용 목적">
        <ul className="ml-4 list-disc space-y-1">
          <li>회원 식별 및 로그인, 회원제 서비스 제공</li>
          <li>상품 주문·결제·배송 및 청약철회·환불 처리</li>
          <li>문의 응대, 리뷰 등 게시판 서비스 운영</li>
          <li>부정 이용 방지 및 서비스 오류 개선</li>
        </ul>
      </Article>

      <Article heading="3. 보유 및 이용 기간">
        <p>
          회원 탈퇴 시 개인정보를 지체 없이 파기합니다. 다만 관계 법령에 따라 아래
          정보는 정해진 기간 동안 보관합니다.
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>계약 또는 청약철회 등에 관한 기록 — 5년 (전자상거래법)</li>
          <li>대금결제 및 재화 등의 공급에 관한 기록 — 5년 (전자상거래법)</li>
          <li>소비자의 불만 또는 분쟁처리에 관한 기록 — 3년 (전자상거래법)</li>
        </ul>
      </Article>

      <Article heading="4. 개인정보 처리의 위탁">
        <p>회사는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁합니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong className="text-wabi-fg">토스페이먼츠</strong> — 결제 처리 및
            결제 도용 방지
          </li>
          <li>
            <strong className="text-wabi-fg">Supabase</strong> — 회원 인증 및
            데이터베이스 운영 (데이터 보관)
          </li>
          <li>
            <strong className="text-wabi-fg">Vercel</strong> — 웹사이트 호스팅 및
            서버 운영
          </li>
        </ul>
        <p>
          Supabase·Vercel 은 국외에 서버를 두고 있어 개인정보가 국외로 이전될 수
          있습니다. 이전 항목은 위 &ldquo;1. 수집하는 개인정보 항목&rdquo;과 같으며,
          서비스 제공 목적 달성 시까지 보관됩니다.
        </p>
      </Article>

      <Article heading="5. 제3자 제공">
        <p>
          회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 배송을 위해
          택배사에 수령인 정보(이름·연락처·주소)를 전달하며, 법령에 따른 요구가 있는
          경우에는 관계 기관에 제공할 수 있습니다.
        </p>
      </Article>

      <Article heading="6. 이용자의 권리">
        <p>
          이용자는 언제든지 마이페이지에서 자신의 개인정보를 조회·수정하거나 회원
          탈퇴를 통해 개인정보 처리 정지를 요구할 수 있습니다. 열람·정정·삭제 요청은{" "}
          {business.email} 로도 접수할 수 있으며, 회사는 지체 없이 조치합니다.
        </p>
      </Article>

      <Article heading="7. 개인정보의 안전성 확보 조치">
        <ul className="ml-4 list-disc space-y-1">
          <li>비밀번호는 복호화가 불가능한 방식으로 암호화하여 저장</li>
          <li>전 구간 HTTPS 암호화 통신 및 보안 헤더 적용</li>
          <li>데이터베이스 접근 권한 제한 — 본인 데이터만 조회 가능하도록 통제</li>
          <li>관리자 작업 이력 기록 및 접근 권한 최소화</li>
        </ul>
      </Article>

      <Article heading="8. 개인정보 보호책임자">
        <p>
          개인정보 보호책임자: {business.privacyOfficer || business.ceo} (
          {business.email})
        </p>
        <p>
          개인정보 침해에 대한 신고·상담이 필요한 경우 개인정보침해신고센터
          (privacy.kisa.or.kr / 국번없이 118)에 문의하실 수 있습니다.
        </p>
      </Article>

      <Article heading="9. 방침의 변경">
        <p>
          본 방침이 변경되는 경우 시행일 7일 전부터 몰의 공지사항을 통해 알립니다.
        </p>
      </Article>
    </LegalPage>
  );
}
