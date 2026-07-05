import { z } from "zod";

// 공용 입력 검증 (보안_체크리스트 P1). 어드민 액션은 requireAdmin 로 보호되므로
// 위협 모델은 외부 공격이 아니라 관리자 실수 — 음수 재고/가격, 초과 길이, 잘못된
// uuid 로 인한 DB 오류를 입구에서 막는다. 특히 음수 stock 은 재고 검증(0010,
// stock < qty)을 무력화하므로 반드시 차단.

export const uuidSchema = z.string().uuid();

// FormData 값에서 uuid 추출·검증. 실패 시 null.
export function parseUuid(value: FormDataEntryValue | null): string | null {
  const parsed = uuidSchema.safeParse(typeof value === "string" ? value : "");
  return parsed.success ? parsed.data : null;
}
