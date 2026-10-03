import { courierOf, formatDateKST, won, withdrawalDeadlineKST } from "@/lib/orders";
import { site } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";
import {
  box,
  button,
  esc,
  infoRows,
  itemRows,
  layout,
  link,
  MAIL_COLOR as C,
  note,
  section,
  type MailItem,
} from "./layout";

// 메일 4종의 제목·본문 (#748). DB 를 모르는 순수 함수 — 보내는 쪽(order-confirmed.ts 등)이
// 값을 모아 넘긴다. 가짜 데이터로 테스트 발송할 수 있게 분리했다.

const BASE = SITE_URL;

export type Mail = { subject: string; html: string };

// ── 주문 접수 ─────────────────────────────────────────────
// 전자상거래법 §13 계약 내용 교부 — 상품·수량·금액·배송비·결제금액·배송지를 빠짐없이.
export function orderConfirmedMail(o: {
  orderNumber: string;
  orderedAt: string;
  recipient: string;
  address: string;
  items: MailItem[];
  shippingFee: number;
  total: number;
}): Mail {
  const totals = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.6;margin-top:4px;border-top:1px solid ${C.line}">
  <tr>
    <td style="padding:12px 0 4px;color:${C.faint}">배송비</td>
    <td align="right" style="padding:12px 0 4px;color:${C.muted}">${o.shippingFee > 0 ? won(o.shippingFee) : "무료"}</td>
  </tr>
  <tr>
    <td style="padding:4px 0;font-weight:600">결제 금액</td>
    <td align="right" style="padding:4px 0;font-weight:600;font-size:16px">${won(o.total)}</td>
  </tr>
</table>`;

  return {
    subject: `[${site.name}] 주문이 접수되었습니다 (${o.orderNumber})`,
    html: layout({
      preheader: `주문번호 ${o.orderNumber} · ${won(o.total)}. 정성껏 준비해 보내드리겠습니다.`,
      title: "주문이 접수되었습니다",
      intro: "와비사비를 찾아 주셔서 감사합니다. 주문하신 상품을 정성껏 준비해 보내드리겠습니다.",
      body: `${section(
        "주문 정보",
        infoRows([
          ["주문번호", o.orderNumber],
          ["주문일", formatDateKST(o.orderedAt)],
          ["받는 분", o.recipient],
          ["배송지", o.address],
        ]),
      )}
${section("주문 상품", itemRows(o.items) + totals)}
${button(`${BASE}/mypage/orders`, "주문 내역 보기")}
${note(
  `도자기·유리 등 일부 기물은 소재 특성상 색상·질감·크기에 개체별 미세한 차이가 있을 수 있습니다(하자 아님).<br>교환·환불은 ${link(`${BASE}/legal/refund`, "교환·환불 안내")}를 참고해 주세요.`,
)}`,
    }),
  };
}

// "우체국택배로" / "CJ대한통운으로": 끝 글자에 받침(ㄹ 제외)이 있으면 "으로".
function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const jong = code % 28;
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`;
}

// ── 배송 시작 ─────────────────────────────────────────────
// 손님이 제일 먼저 하는 일 = 배송 조회. 송장번호를 복사해 검색하지 않게 버튼으로.
// 택배사는 주문에 저장된 코드(#756). "기타"는 이름을 모르니 택배사 줄을 빼고 네이버 조회로.
export function orderShippedMail(o: {
  orderNumber: string;
  courier: string | null;
  trackingNumber: string;
  recipient: string;
  address: string;
  items: MailItem[];
}): Mail {
  const courier = courierOf(o.courier);
  const courierRow = courier.name
    ? `<tr>
    <td style="color:${C.faint};width:76px;padding-right:12px;padding-bottom:4px;white-space:nowrap">택배사</td>
    <td style="color:${C.ink};padding-bottom:4px">${esc(courier.name)}</td>
  </tr>
  `
    : "";
  const tracking = box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.6">
  ${courierRow}<tr>
    <td style="color:${C.faint};width:76px;padding-right:12px;white-space:nowrap">송장번호</td>
    <td style="color:${C.ink};font-size:16px;font-weight:600;letter-spacing:.04em">${esc(o.trackingNumber)}</td>
  </tr>
</table>`);

  return {
    subject: `[${site.name}] 상품이 발송되었습니다 (${o.orderNumber})`,
    html: layout({
      preheader: `${courier.name ? `${courier.name} ` : ""}송장번호 ${o.trackingNumber}. 버튼 하나로 배송을 조회하실 수 있습니다.`,
      title: "상품이 발송되었습니다",
      intro: courier.name
        ? `주문하신 상품이 ${withRo(courier.name)} 출발했습니다.`
        : "주문하신 상품이 출발했습니다.",
      body: `${tracking}
${button(courier.trackUrl(o.trackingNumber), "배송 조회하기")}
${section("보내드린 상품", itemRows(o.items))}
${section(
  "받는 곳",
  infoRows([
    ["주문번호", o.orderNumber],
    ["받는 분", o.recipient],
    ["배송지", o.address],
  ]),
)}
${note(
  `상품을 받으신 날부터 7일 이내 교환·환불을 요청하실 수 있습니다. ${link(`${BASE}/legal/refund`, "교환·환불 안내")}<br>${link(`${BASE}/mypage/orders`, "주문 내역 보기")}`,
)}`,
    }),
  };
}

// ── 주문 취소·환불 ─────────────────────────────────────────
// 손님 취소·관리자 취소·결제 중 재고 소진 자동 취소(#780). 관리자 취소는 손님 요청(DM 등)
// 일 수도 있어 "판매자 사정"이라고 단정하지 않는다.
export type CancelCause = "customer" | "admin" | "out_of_stock";

const CANCEL_INTRO: Record<CancelCause, string> = {
  customer: "요청하신 주문 취소가 완료되었습니다. 결제하신 금액은 전액 환불됩니다.",
  admin: "주문이 취소되어 결제하신 금액을 전액 환불해 드립니다. 취소 사유가 궁금하시면 문의해 주세요.",
  out_of_stock:
    "결제하시는 사이 상품 재고가 모두 소진되어 주문이 취소되었습니다. 불편을 드려 죄송합니다. 결제하신 금액은 전액 환불됩니다.",
};

export function orderCancelledMail(o: {
  orderNumber: string;
  cause: CancelCause;
  refundAmount: number;
  items: MailItem[];
}): Mail {
  const refund = box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.6">
  <tr>
    <td style="color:${C.faint};width:76px;padding-right:12px;padding-bottom:4px;white-space:nowrap">환불 금액</td>
    <td style="color:${C.ink};font-size:16px;font-weight:600;padding-bottom:4px">${won(o.refundAmount)}</td>
  </tr>
  <tr>
    <td style="color:${C.faint};width:76px;padding-right:12px;white-space:nowrap">환불 수단</td>
    <td style="color:${C.ink}">결제하신 수단으로 전액</td>
  </tr>
</table>`);

  return {
    subject: `[${site.name}] 주문이 취소되었습니다 (${o.orderNumber})`,
    html: layout({
      preheader: `주문번호 ${o.orderNumber} · ${won(o.refundAmount)} 전액 환불.`,
      title: "주문이 취소되었습니다",
      intro: CANCEL_INTRO[o.cause],
      body: `${refund}
${section("취소된 상품", itemRows(o.items))}
${section("주문 정보", infoRows([["주문번호", o.orderNumber]]))}
${note(
  `카드 결제는 카드사에 따라 환불이 반영되기까지 영업일 기준 3~7일이 걸릴 수 있습니다.<br>궁금하신 점은 ${link(`${BASE}/inquiry`, "문의 게시판")}이나 인스타그램 DM으로 남겨 주세요.`,
)}`,
    }),
  };
}

// ── 배송 완료 + 리뷰 요청 ──────────────────────────────────
// 관리자가 배송완료를 처리한 때 1회(#783). 거래 안내(수령 확인·교환·환불 기한)가 본문이고
// 리뷰는 보상 없는 부탁 한 줄 + 버튼. reviewHref 가 없으면(비회원: 리뷰는 로그인 필요)
// 리뷰 부분을 빼고 거래 안내만 보낸다.
export function orderDeliveredMail(o: {
  orderNumber: string;
  deliveredAt: string;
  items: MailItem[];
  reviewHref: string | null;
}): Mail {
  const deadline = withdrawalDeadlineKST(o.deliveredAt);
  const due = box(`<p style="margin:0;font-size:12px;color:${C.faint}">교환·환불 요청 기한</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:600;color:${C.ink}">${esc(deadline)}까지</p>`);
  const review = o.reviewHref
    ? `${section(
        "리뷰 부탁드려요",
        `<p style="margin:0;font-size:14px;line-height:1.7;color:${C.muted};word-break:keep-all">직접 써 보신 이야기는 그릇을 고르는 다른 분들께 큰 도움이 됩니다. 사진 한 장, 한 줄이어도 좋습니다.</p>`,
      )}
${button(o.reviewHref, "리뷰 남기기")}`
    : "";

  return {
    subject: `[${site.name}] 상품을 잘 받으셨나요? (${o.orderNumber})`,
    html: layout({
      preheader: `배송이 완료되었습니다. 교환·환불은 ${deadline}까지 요청하실 수 있습니다.`,
      title: "상품을 잘 받으셨나요?",
      intro: "주문하신 상품이 배송 완료되었습니다. 받아 보신 그릇이 오래 곁에 머물기를 바랍니다.",
      body: `${due}
${section("받으신 상품", itemRows(o.items))}
${review}
${note(
  `상품에 문제가 있거나 받지 못하셨다면 ${link(`${BASE}/inquiry`, "문의 게시판")}이나 인스타그램 DM으로 알려 주세요. ${link(`${BASE}/legal/refund`, "교환·환불 안내")}<br>주문번호 ${esc(o.orderNumber)}`,
)}`,
    }),
  };
}

// ── 대표님 알림(가게용) ───────────────────────────────────
// 손님이 아니라 가게 메일함으로 가는 운영 알림(#780 환불 실패, 새 주문·새 문의).
// 짧게: 무슨 일인지 + 바로 가는 버튼. 개인정보는 최소(받는 분 이름 정도).
export function shopAlertMail(a: {
  subject: string;
  title: string;
  intro: string;
  rows?: [label: string, value: string][];
  action: { href: string; label: string };
}): Mail {
  return {
    subject: `[${site.name} 관리] ${a.subject}`,
    html: layout({
      preheader: a.intro,
      title: a.title,
      intro: a.intro,
      body: `${a.rows?.length ? section("내용", infoRows(a.rows)) : ""}
${button(a.action.href, a.action.label)}`,
    }),
  };
}

// ── 문의 답변 ─────────────────────────────────────────────
// 답변 본문은 싣지 않는다 — 비밀글이 메일로 새는 경로를 만들지 않는다(#133).
export function inquiryAnsweredMail(i: { inquiryId: string; title: string }): Mail {
  return {
    subject: `[${site.name}] 문의하신 내용에 답변이 등록되었습니다`,
    html: layout({
      preheader: `“${i.title}” 문의에 답변이 등록되었습니다.`,
      title: "문의하신 내용에 답변이 등록되었습니다",
      body: `${box(`<p style="margin:0;font-size:12px;color:${C.faint}">문의 제목</p>
<p style="margin:4px 0 0;font-size:15px;color:${C.ink};word-break:keep-all">${esc(i.title)}</p>`)}
${button(`${BASE}/inquiry/${encodeURIComponent(i.inquiryId)}`, "답변 확인하기")}
${note("답변 내용은 보안을 위해 메일에 담지 않습니다. 로그인 후 확인해 주세요.")}`,
    }),
  };
}

// ── 재입고 ───────────────────────────────────────────────
export function restockMail(p: {
  productId: string;
  name: string;
  image: string | null;
}): Mail {
  const photo = p.image
    ? `<img src="${esc(p.image)}" width="240" alt="" style="display:block;width:240px;max-width:100%;height:auto;border:0;border-radius:8px;margin-top:24px">`
    : "";
  return {
    subject: `[${site.name}] ${p.name} 재입고 알림`,
    html: layout({
      preheader: `기다리시던 ${p.name}이(가) 다시 들어왔습니다.`,
      title: "기다리시던 상품이 다시 들어왔습니다",
      body: `${photo}
<p style="margin:16px 0 0;font-size:16px;font-weight:600;color:${C.ink};word-break:keep-all">${esc(p.name)}</p>
<p style="margin:6px 0 0;font-size:14px;color:${C.muted}">수량이 한정되어 있어 일찍 품절될 수 있습니다.</p>
${button(`${BASE}/shop/${encodeURIComponent(p.productId)}`, "상품 보러 가기")}
${note("이 메일은 재입고 알림을 신청하신 분께 한 번만 보내드립니다.")}`,
    }),
  };
}
