import { COURIER, formatDateKST, won } from "@/lib/orders";
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

// ── 배송 시작 ─────────────────────────────────────────────
// 손님이 제일 먼저 하는 일 = 배송 조회. 송장번호를 복사해 검색하지 않게 버튼으로.
export function orderShippedMail(o: {
  orderNumber: string;
  trackingNumber: string;
  recipient: string;
  address: string;
  items: MailItem[];
}): Mail {
  const tracking = box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.6">
  <tr>
    <td style="color:${C.faint};width:76px;padding-right:12px;white-space:nowrap">택배사</td>
    <td style="color:${C.ink}">${esc(COURIER.name)}</td>
  </tr>
  <tr>
    <td style="color:${C.faint};padding-right:12px;padding-top:4px;white-space:nowrap">송장번호</td>
    <td style="color:${C.ink};padding-top:4px;font-size:16px;font-weight:600;letter-spacing:.04em">${esc(o.trackingNumber)}</td>
  </tr>
</table>`);

  return {
    subject: `[${site.name}] 상품이 발송되었습니다 (${o.orderNumber})`,
    html: layout({
      preheader: `${COURIER.name} 송장번호 ${o.trackingNumber}. 버튼 하나로 배송을 조회하실 수 있습니다.`,
      title: "상품이 발송되었습니다",
      intro: `주문하신 상품이 ${COURIER.name}로 출발했습니다.`,
      body: `${tracking}
${button(COURIER.trackUrl(o.trackingNumber), "배송 조회하기")}
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
