import type { Metadata } from "next";
import { LegalPage, Article } from "@/components/legal-layout";
import { business } from "@/lib/site";

export const metadata: Metadata = { title: "교환·환불 안내" };

// ⚠ 초안 — 대표님 확인 및 필요 시 법률 검토 후 확정할 것 (#106).
// 실제 구현과 일치시킬 것: 배송 전(paid) 주문만 사이트에서 직접 취소 가능하고
// (cancel_paid_order RPC → 토스 전액 환불), 배송 이후는 문의 게시판 경유다.
// 반품 배송비·회수 방법은 대표님 확정 필요(현재 문구는 법정 원칙만 기술).
export default function RefundPage() {
  return (
    <LegalPage title="교환·환불 안내" effectiveDate="2026년 7월 13일">
      <Article heading="1. 청약철회 기간">
        <p>
          이용자는 상품을 수령한 날부터 <strong className="text-wabi-fg">7일
          이내</strong>에 청약철회(반품)를 요청할 수 있습니다. 상품의 내용이 표시
          내용과 다르거나 계약과 다르게 이행된 경우에는 수령일부터 3개월 이내, 그
          사실을 안 날부터 30일 이내에 청약철회가 가능합니다.
        </p>
      </Article>

      <Article heading="2. 배송 전 주문 취소">
        <p>
          결제 완료 후 <strong className="text-wabi-fg">배송이 시작되기 전</strong>
          까지는 마이페이지 &gt; 주문 내역에서 직접 취소할 수 있으며, 결제 금액은
          전액 환불됩니다.
        </p>
        <p>
          배송이 시작된 이후에는 사이트에서 직접 취소할 수 없으며, 문의 게시판 또는{" "}
          {business.email} 로 연락해 주시기 바랍니다.
        </p>
      </Article>

      <Article heading="3. 청약철회가 제한되는 경우">
        <ul className="ml-4 list-disc space-y-1">
          <li>이용자의 책임 있는 사유로 상품이 멸실·훼손된 경우</li>
          <li>이용자의 사용 또는 일부 소비로 상품의 가치가 현저히 감소한 경우</li>
          <li>
            주문에 따라 개별적으로 생산되는 상품 등으로, 청약철회 시 회사에 회복할
            수 없는 중대한 피해가 예상되는 경우 (사전에 별도로 고지하고 동의를 받은
            경우에 한함)
          </li>
        </ul>
        <p>
          단순 변심에 의한 반품이라도 상품을 개봉·사용하지 않았다면 위 제한에
          해당하지 않습니다.
        </p>
      </Article>

      <Article heading="4. 수공예품의 특성">
        <p>
          본 몰에서 판매하는 도자기·공예품은 수작업으로 제작되어 색상·질감·크기·굽의
          형태 등에 <strong className="text-wabi-fg">개체별 미세한 차이</strong>가
          있습니다. 이는 제품의 하자가 아니라 수공예품의 고유한 특성이므로 하자로
          인한 교환·환불 사유에 해당하지 않습니다. 다만 파손·균열 등 명백한 불량은
          아래 &ldquo;5. 불량·오배송&rdquo;에 따라 처리합니다.
        </p>
      </Article>

      <Article heading="5. 불량·오배송">
        <p>
          상품이 파손되었거나 주문과 다른 상품이 배송된 경우, 수령일부터 3개월 이내에
          문의 게시판 또는 {business.email} 로 알려주시면 교환 또는 전액 환불해
          드립니다. 이 경우 반품에 필요한 비용은 회사가 부담합니다.
        </p>
        <p>
          접수 시 파손 부위 또는 배송된 상품의 사진을 함께 보내주시면 처리가
          빨라집니다.
        </p>
      </Article>

      <Article heading="6. 반품 배송비">
        <p>
          단순 변심에 의한 청약철회의 경우 반품 배송비는 이용자가 부담합니다. 상품의
          불량·오배송 등 회사의 귀책사유로 인한 반품의 경우 회사가 부담합니다.
        </p>
      </Article>

      <Article heading="7. 환불 시기 및 방법">
        <p>
          배송 전 취소는 즉시 결제 취소(전액 환불)가 진행됩니다. 반품의 경우 회사가
          상품을 회수하고 상태를 확인한 날부터{" "}
          <strong className="text-wabi-fg">3영업일 이내</strong>에 환불 처리합니다.
        </p>
        <p>
          환불은 원결제 수단으로 취소하는 방식으로 진행되며, 카드 결제의 경우 카드사
          정책에 따라 승인 취소가 반영되기까지 며칠이 더 소요될 수 있습니다.
        </p>
      </Article>

      <Article heading="8. 문의">
        <p>
          교환·환불 관련 문의는 몰의 문의 게시판 또는 {business.email} 로 연락해
          주시기 바랍니다.
        </p>
      </Article>
    </LegalPage>
  );
}
