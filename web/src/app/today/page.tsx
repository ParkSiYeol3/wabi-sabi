import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { MomentForm } from "@/components/moment-form";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { deleteMoment } from "./actions";

export const metadata: Metadata = {
  title: "오늘의 와비사비",
  description:
    "손님들이 일상 속에서 와비사비의 그릇을 어떻게 쓰고 있는지 나누는 공간입니다.",
};

type Moment = {
  id: string;
  author_name: string;
  image_url: string;
  body: string | null;
  created_at: string;
  user_id: string;
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS(public read)로 hidden=false 만 조회된다.
  const { data } = await supabase
    .from("wabi_moments")
    .select("id, author_name, image_url, body, created_at, user_id")
    .order("created_at", { ascending: false })
    .returns<Moment[]>();
  const moments = data ?? [];

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-tight">오늘의 와비사비</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-wabi-fg-muted">
        손님들이 일상 속에서 우리의 그릇을 어떻게 쓰고 있는지 나누는 공간입니다.
        오늘의 한 컷을 함께 남겨주세요.
      </p>

      <div className="mt-8">
        {user ? (
          <MomentForm />
        ) : (
          <p className="border border-wabi-border bg-wabi-subtle/40 px-4 py-3 text-sm text-wabi-fg-muted">
            <Link
              href="/auth?redirect=/today"
              className="font-medium text-wabi-fg underline underline-offset-2"
            >
              로그인
            </Link>{" "}
            후 사진과 이야기를 남길 수 있습니다.
          </p>
        )}
      </div>

      {moments.length === 0 ? (
        <p className="mt-16 text-center text-sm text-wabi-fg-muted">
          아직 올라온 이야기가 없습니다. 첫 번째 순간을 남겨보세요.
        </p>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {moments.map((m) => (
            <li
              key={m.id}
              className="group flex flex-col border border-wabi-border bg-wabi-bg"
            >
              <div className="relative aspect-square overflow-hidden bg-wabi-muted">
                <Image
                  src={m.image_url}
                  alt={m.body ? m.body.slice(0, 60) : `${m.author_name}의 순간`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                {m.body && (
                  <p className="text-sm leading-6 text-wabi-fg">{m.body}</p>
                )}
                <div className="mt-auto flex items-center justify-between text-xs text-wabi-fg-muted">
                  <span>{m.author_name}</span>
                  <span className="flex items-center gap-2">
                    <time>
                      {new Date(m.created_at).toLocaleDateString("ko-KR")}
                    </time>
                    {user?.id === m.user_id && (
                      <form action={deleteMoment}>
                        <input type="hidden" name="id" value={m.id} />
                        <SubmitButton
                          pendingText="삭제 중…"
                          className="cursor-pointer text-red-700 underline-offset-2 hover:underline"
                        >
                          삭제
                        </SubmitButton>
                      </form>
                    )}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
