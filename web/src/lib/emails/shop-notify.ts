import { sendMail } from "@/lib/email";
import { business } from "@/lib/site";
import type { Mail } from "./templates";

// 가게(대표님) 메일함으로 운영 알림(#780). 받는 주소는 SHOP_NOTIFY_EMAIL 이 있으면 그것,
// 없으면 사업자 정보의 문의 메일. 알림 실패가 본 흐름(결제·취소)을 막지 않는다.
export async function notifyShop(mail: Mail): Promise<void> {
  const to = process.env.SHOP_NOTIFY_EMAIL || business.email;
  if (!to) return;
  await sendMail({ to, ...mail }).catch((e) =>
    console.error("[email] 가게 알림 실패:", mail.subject, e),
  );
}
