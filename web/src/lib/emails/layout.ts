import { escapeHtml } from "@/lib/email";
import { business } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";

// 메일 공용 틀 (#748, 2026-10-02 — 첫 실주문 뒤 메일 4종 통일).
//
// 메일 앱(네이버·Gmail·아웃룩·iOS)은 <style>·웹폰트·flex·grid 지원이 제각각이라
// table + 인라인 스타일만 쓴다. 색은 사이트 크림 팔레트(globals.css)와 같은 값.
// 로고는 이미지 — 메일에선 마루부리 같은 웹폰트가 거의 안 먹는다.
//
// 여기 함수들은 DB 를 모른다(순수 문자열). 그래서 가짜 데이터로 테스트 발송이 된다.
// 사용자 입력(상품명·수령인·주소 등)은 호출하는 쪽이 아니라 **여기서** 이스케이프한다
// — 넘겨받는 값은 전부 평문으로 취급한다(링크 href 만 예외, 내부에서 만든 URL).

export const MAIL_COLOR = {
  bg: "#f3ebdd", // 크림(사이트 배경)
  card: "#fbf7ef", // 카드: 크림보다 한 톤 밝게
  ink: "#423c30", // 먹빛 브라운(본문·버튼)
  muted: "#6b6353",
  faint: "#8a8170",
  line: "#d7cfc1",
} as const;

const C = MAIL_COLOR;
const FONT =
  "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',sans-serif";

export const esc = escapeHtml;

// 상품 사진 — products.images 의 첫 장(Supabase 공개 URL, 절대 주소). 없으면 null.
export function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string" ? images[0] : null;
}

// 라벨·값 줄 묶음(주문번호·배송지 등). 값은 왼쪽 정렬 — 긴 주소가 오른쪽 정렬이면 읽기 어렵다.
export function infoRows(rows: [label: string, value: string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.6">
${rows
  .map(
    ([label, value]) => `  <tr>
    <td valign="top" style="width:76px;padding:6px 12px 6px 0;color:${C.faint};white-space:nowrap">${esc(label)}</td>
    <td valign="top" style="padding:6px 0;color:${C.ink};word-break:keep-all">${esc(value)}</td>
  </tr>`,
  )
  .join("\n")}
</table>`;
}

export type MailItem = {
  name: string;
  quantity: number;
  image: string | null;
  // "종류: 대접" 같은 옵션·"+ 선물 포장" 같은 추가 구성 — 이름 아래 작은 줄들.
  details?: string[];
  // 금액(주문 접수 메일만). 없으면 칸을 그리지 않는다.
  price?: string;
};

// 상품 목록 — 사진(56px) + 이름 × 수량 + 옵션 줄 (+ 금액).
// 사진은 width 만 고정하고 높이는 비율대로 — object-fit 을 못 쓰는 메일 앱(Gmail 등)에서
// 높이까지 고정하면 세로로 찌그러진다.
export function itemRows(items: MailItem[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.5">
${items
  .map((it, i) => {
    const thumb = it.image
      ? `<img src="${esc(it.image)}" width="56" alt="" style="display:block;width:56px;height:auto;border:0;border-radius:6px">`
      : `<div style="width:56px;height:56px;border-radius:6px;background:${C.line}"></div>`;
    const details = (it.details ?? [])
      .map((d) => `<div style="font-size:12px;color:${C.faint};margin-top:2px">${esc(d)}</div>`)
      .join("");
    const border = i === 0 ? "" : `border-top:1px solid ${C.line};`;
    return `  <tr>
    <td valign="top" style="${border}width:56px;padding:12px 14px 12px 0">${thumb}</td>
    <td valign="top" style="${border}padding:12px 0;color:${C.ink};word-break:keep-all">${esc(it.name)} <span style="color:${C.faint}">× ${it.quantity}</span>${details}</td>
    ${it.price !== undefined ? `<td valign="top" align="right" style="${border}padding:12px 0 12px 12px;color:${C.ink};white-space:nowrap">${esc(it.price)}</td>` : ""}
  </tr>`;
  })
  .join("\n")}
</table>`;
}

// 소제목 + 내용. 구분선은 소제목 위 여백으로만 — 선을 늘리면 표처럼 딱딱해진다.
export function section(label: string, inner: string): string {
  return `<p style="margin:28px 0 8px;font-size:12px;letter-spacing:.06em;color:${C.faint}">${esc(label)}</p>
${inner}`;
}

// 버튼 — 아웃룩까지 버티는 table 버튼(배경을 td 에 둔다). href 는 내부에서 만든 URL.
export function button(href: string, label: string, opts?: { secondary?: boolean }): string {
  const solid = !opts?.secondary;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px">
  <tr>
    <td ${solid ? `bgcolor="${C.ink}"` : ""} style="border-radius:8px;${solid ? `background:${C.ink};` : `border:1px solid ${C.ink};`}">
      <a href="${href}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:600;color:${solid ? "#ffffff" : C.ink};text-decoration:none">${esc(label)}</a>
    </td>
  </tr>
</table>`;
}

// 강조 상자(송장번호·문의 제목 등) — 카드 안의 한 톤 진한 칸.
export function box(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px">
  <tr><td style="background:${C.bg};border-radius:8px;padding:16px 18px">${inner}</td></tr>
</table>`;
}

// 작은 안내문. html 을 받는다(링크 포함) — 호출부에서 사용자 입력을 넣지 말 것.
export function note(html: string): string {
  return `<p style="margin:28px 0 0;font-size:12px;line-height:1.8;color:${C.faint}">${html}</p>`;
}

export function link(href: string, label: string): string {
  return `<a href="${href}" style="color:${C.muted};text-decoration:underline">${esc(label)}</a>`;
}

// 전체 문서. preheader = 받은편지함 목록에서 제목 옆에 보이는 미리보기 문장.
export function layout(input: {
  preheader: string;
  title: string;
  intro?: string;
  body: string;
}): string {
  const b = business;
  const biz = [
    `상호 ${b.companyName}`,
    `대표 ${b.ceo}`,
    b.businessNumber && `사업자등록번호 ${b.businessNumber}`,
    b.mailOrderNumber && `통신판매업 ${b.mailOrderNumber}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(input.title)}</title>
</head>
<body style="margin:0;padding:0">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(input.preheader)}</div>
<!-- 메일 한 장 = 폭 600px 크림 덩어리(#750). 바깥은 메일 앱 기본 배경으로 두어, PC 에서
     축소해 봐도 크림이 창 전체로 퍼지지 않고 한 장으로 보인다. 600px 보다 좁은 휴대폰에서만
     화면 폭에 맞춰 줄어든다(완전 고정이면 손님이 가로로 밀어 봐야 한다). -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:24px 0">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="width:100%;max-width:600px;background:${C.bg}">
  <tr>
    <td align="center" style="padding:32px 20px 40px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT};color:${C.ink}">
        <tr>
          <td style="padding:0 4px 24px">
            <a href="${SITE_URL}" style="text-decoration:none;color:${C.ink}">
              <img src="${SITE_URL}/brand/logo-mark.png" width="44" height="22" alt="" style="display:inline-block;vertical-align:middle;border:0">
              <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:13px;letter-spacing:.24em;color:${C.ink}">WABI-SABI</span>
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:${C.card};border:1px solid ${C.line};border-radius:12px;padding:32px 28px">
            <h1 style="margin:0;font-size:20px;font-weight:600;line-height:1.45;color:${C.ink};word-break:keep-all">${esc(input.title)}</h1>
            ${input.intro ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:${C.muted};word-break:keep-all">${esc(input.intro)}</p>` : ""}
            ${input.body}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 4px 0;font-size:11px;line-height:1.8;color:${C.faint};word-break:keep-all">
            ${esc(biz)}<br>
            ${esc(b.address)}<br>
            문의 ${esc(b.email)}${b.phone ? ` · ${esc(b.phone)}` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
