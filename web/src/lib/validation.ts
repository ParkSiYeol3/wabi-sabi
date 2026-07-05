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

// FormData 숫자 필드 — 누락·빈값은 undefined 로 반환(0 폴백 금지).
// `Number(x || 0)` 은 필드가 비면 조용히 0 이 되어 재고 초기화 사고를 낼 수 있음.
// undefined 를 스키마(z.number())에 넘겨 검증 실패로 처리한다.
export function numField(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}
