"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { uploadSiteImage, deleteProductImage } from "@/lib/storage";
import {
  getMomentsPage,
  MOMENTS_PAGE_SIZE,
  type MomentCard,
} from "@/lib/queries/moments";

// "오늘의 와비사비" 게시 — 로그인 사용자, 사진 필수 + 짧은 글(선택).
// 사진 업로드는 서버(service_role)에서 처리하므로 사용자 스토리지 RLS 불요.
export type MomentResult = { ok: boolean; message: string };

const bodySchema = z.string().trim().max(500);

export async function createMoment(
  _prev: MomentResult | null,
  formData: FormData,
): Promise<MomentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth?redirect=/today");
  if (!adminConfigured())
    return { ok: false, message: "서버 설정 오류로 업로드할 수 없습니다." };

  const file = formData
    .getAll("image")
    .find((f): f is File => f instanceof File && f.size > 0);
  if (!file) return { ok: false, message: "사진을 선택하세요." };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return { ok: false, message: "png·jpg·webp 사진만 올릴 수 있습니다." };
  if (file.size > 12 * 1024 * 1024)
    return { ok: false, message: "사진은 12MB 이하여야 합니다." };

  const parsedBody = bodySchema.safeParse(String(formData.get("body") || ""));
  if (!parsedBody.success)
    return { ok: false, message: "글은 500자 이내로 써주세요." };
  const body = parsedBody.data || null;

  // 사용자당 시간 10건 — 도배 차단(키가 user.id 라 IP 우회 무효).
  const { ok } = await rateLimit(`moment:${user.id}`, 10, 3_600);
  if (!ok)
    return { ok: false, message: "너무 자주 올렸습니다. 잠시 후 다시 시도하세요." };

  const { url, error } = await uploadSiteImage(file, `moment-${user.id}`);
  if (!url)
    return { ok: false, message: `업로드 실패: ${error ?? "알 수 없는 오류"}` };

  // 표시 이름 — 프로필 이름, 없으면 이메일 앞부분.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle<{ name: string | null }>();
  const authorName =
    profile?.name?.trim() || user.email?.split("@")[0] || "와비사비 손님";

  const { error: insErr } = await supabase.from("wabi_moments").insert({
    user_id: user.id,
    author_name: authorName,
    image_url: url,
    body,
  });
  if (insErr) {
    await deleteProductImage(url); // 저장 실패 시 올린 사진 회수
    console.error("[moment] insert 실패", insErr);
    return { ok: false, message: "등록에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  revalidatePath("/today");
  return { ok: true, message: "등록되었습니다." };
}

// 본인 글 삭제 — RLS(delete own)로 본인만. 사진 파일도 정리.
export async function deleteMoment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") || "");
  if (!z.string().uuid().safeParse(id).success) return;

  const { data: row } = await supabase
    .from("wabi_moments")
    .select("image_url, user_id")
    .eq("id", id)
    .maybeSingle<{ image_url: string; user_id: string }>();
  if (!row || row.user_id !== user.id) return;

  const { error } = await supabase.from("wabi_moments").delete().eq("id", id);
  if (error) {
    console.error("[moment] delete 실패", id, error);
    return;
  }
  await deleteProductImage(row.image_url);
  revalidatePath("/today");
  revalidatePath(`/today/${id}`);

  // 상세에서 삭제한 경우 목록으로 복귀(그리드는 redirect 없이 revalidate 만).
  const redirectTo = String(formData.get("redirect") || "");
  if (redirectTo.startsWith("/") && !redirectTo.startsWith("//"))
    redirect(redirectTo);
}

// 더보기 — 다음 페이지를 서버에서 받아 클라이언트가 이어붙인다(0039 페이지네이션).
export async function loadMoreMoments(
  offset: number,
): Promise<{ moments: MomentCard[]; hasMore: boolean }> {
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  return getMomentsPage(safeOffset, MOMENTS_PAGE_SIZE);
}

// 공감 토글 — 로그인 본인 1건(PK 로 중복 차단). 최신 개수·본인 여부를 돌려준다.
export async function toggleLike(
  momentId: string,
): Promise<{ liked: boolean; count: number } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!z.string().uuid().safeParse(momentId).success) return null;

  const { data: existing } = await supabase
    .from("moment_likes")
    .select("moment_id")
    .eq("moment_id", momentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("moment_likes")
      .delete()
      .eq("moment_id", momentId)
      .eq("user_id", user.id);
  } else {
    const { error } = await supabase
      .from("moment_likes")
      .insert({ moment_id: momentId, user_id: user.id });
    // 23505 = 유니크 충돌(동시 클릭) — 이미 눌린 것이므로 무시.
    if (error && error.code !== "23505") {
      console.error("[moment] like 실패", error);
      return null;
    }
  }

  const { count } = await supabase
    .from("moment_likes")
    .select("*", { count: "exact", head: true })
    .eq("moment_id", momentId);

  revalidatePath("/today");
  revalidatePath(`/today/${momentId}`);
  return { liked: !existing, count: count ?? 0 };
}

// 댓글 등록 — 로그인 본인, 1~500자. 도배 방지 시간 30건.
export type CommentResult = { ok: boolean; message: string };
const commentSchema = z.string().trim().min(1).max(500);

export async function createComment(
  _prev: CommentResult | null,
  formData: FormData,
): Promise<CommentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, message: "로그인 후 댓글을 남길 수 있습니다." };

  const momentId = String(formData.get("moment_id") || "");
  if (!z.string().uuid().safeParse(momentId).success)
    return { ok: false, message: "잘못된 요청입니다." };

  const parsed = commentSchema.safeParse(String(formData.get("body") || ""));
  if (!parsed.success)
    return { ok: false, message: "댓글은 1~500자로 써주세요." };

  const { ok } = await rateLimit(`comment:${user.id}`, 30, 3_600);
  if (!ok)
    return { ok: false, message: "너무 자주 남겼습니다. 잠시 후 다시 시도하세요." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle<{ name: string | null }>();
  const authorName =
    profile?.name?.trim() || user.email?.split("@")[0] || "와비사비 손님";

  const { error } = await supabase.from("moment_comments").insert({
    moment_id: momentId,
    user_id: user.id,
    author_name: authorName,
    body: parsed.data,
  });
  if (error) {
    console.error("[comment] insert 실패", error);
    return { ok: false, message: "등록에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  revalidatePath(`/today/${momentId}`);
  revalidatePath("/today");
  return { ok: true, message: "등록되었습니다." };
}

// 본인 댓글 삭제 — RLS(delete own) + user_id 조건 이중 방어.
export async function deleteComment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("id") || "");
  const momentId = String(formData.get("moment_id") || "");
  if (!z.string().uuid().safeParse(id).success) return;

  const { error } = await supabase
    .from("moment_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[comment] delete 실패", id, error);
    return;
  }
  if (z.string().uuid().safeParse(momentId).success)
    revalidatePath(`/today/${momentId}`);
  revalidatePath("/today");
}
