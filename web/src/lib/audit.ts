import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

// 어드민 액션 감사로그 (0013). service_role 로 기록 — 실패해도 원 작업은 진행
// (로깅 실패가 관리 작업을 막지 않도록). 호출부는 mutation 성공 후 호출.

type AuditInput = {
  action: string; // "product.create" 등 도메인.동작
  targetTable?: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
};

export async function logAdminAction(
  actor: Pick<User, "id" | "email">,
  input: AuditInput,
): Promise<void> {
  if (!adminConfigured()) return;
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      actor_id: actor.id,
      actor_email: actor.email ?? null,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      meta: input.meta ?? null,
    });
  } catch (e) {
    // 로깅 실패는 삼킨다 — 감사 누락이 관리 작업 차단보다 낫다. 콘솔로만 남김.
    console.error("[audit] 기록 실패", input.action, e);
  }
}

// 사람이 아닌 자동 처리(크론 등)의 기록(#791). actor_id 는 비우고 actor_email 에 출처를 남긴다.
export async function logSystemAction(source: string, input: AuditInput): Promise<void> {
  if (!adminConfigured()) return;
  try {
    await createAdminClient().from("admin_audit_log").insert({
      actor_id: null,
      actor_email: `system:${source}`,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      meta: input.meta ?? null,
    });
  } catch (e) {
    console.error("[audit] 기록 실패", input.action, e);
  }
}
