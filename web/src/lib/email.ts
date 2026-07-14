// 메일 발송 (#129) — Resend REST API 직접 호출(SDK 의존성 없이 fetch).
//
// RESEND_API_KEY 가 없으면 발송을 건너뛴다. 메일은 부가 통지이므로 키 미설정 때문에
// 결제·주문 같은 본 흐름이 실패해선 안 된다(로그만 남기고 계속 — IG 피드·rate limit 과
// 동일한 패턴).
//
// 발신 도메인은 Resend 에서 인증돼 있어야 한다(👤 시열님 — DNS 레코드 등록).
// 미인증 도메인으로 보내면 Resend 가 403 을 준다 → 로그로 드러난다.

const RESEND_API = "https://api.resend.com/emails";

export function mailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function fromAddress(): string {
  // 표시 이름 포함. 미설정 시 발송을 시도하지 않으므로 기본값은 참고용.
  return process.env.EMAIL_FROM || "WABI-SABI <noreply@wasa.kr>";
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!mailConfigured()) {
    console.warn("[email] RESEND_API_KEY 미설정 — 발송 건너뜀:", input.subject);
    return false;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) {
      // 본문에 실패 이유(도메인 미인증 등)가 담긴다 — 운영에서 원인 추적에 필요.
      const body = await res.text().catch(() => "");
      console.error(`[email] 발송 실패 ${res.status}`, body.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] 발송 예외", err);
    return false;
  }
}

// HTML 본문에 사용자 입력(상품명·수령인 등)을 넣기 전 이스케이프.
// 메일 클라이언트에서 스크립트가 실행되진 않지만, 태그가 섞이면 레이아웃이 깨지고
// 링크 위장(피싱)이 가능해진다.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
