import { won, formatDateKST } from "@/lib/orders";
import { lastUsableIso } from "@/lib/coupons";
import { TablePanel } from "@/components/admin/ui";

// 회원 목록(#665) — 모바일은 스택 카드, 데스크톱은 테이블(구매자 관리와 같은 구성).
// 데이터 조회와 분리해 두어 화면 확인 때 가짜 행으로도 그려 볼 수 있다.

export type MemberRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  providers: string[];
  joined_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  marketing: boolean | null;
  orders: number;
  amount: number;
  // 쿠폰 현황(0069) — 지금 쓸 수 있는 장수·가장 먼저 끝나는 기한·지금까지 쓴 장수.
  coupon_unused: number;
  coupon_next_expiry: string | null;
  coupon_used: number;
};

const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  kakao: "카카오",
  google: "구글",
};

const chip =
  "rounded-full border border-wabi-border px-2 py-0.5 text-[10px] text-wabi-fg-muted";

function Providers({ list }: { list: string[] }) {
  if (list.length === 0) return <span className="text-wabi-fg-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((p) => (
        <span key={p} className={chip}>
          {PROVIDER_LABEL[p] ?? p}
        </span>
      ))}
    </span>
  );
}

// 쿠폰 칸 — 가진 게 있으면 장수와 기한을, 다 썼으면 쓴 장수를, 없으면 줄표.
// "받았는데 기한이 지난" 경우는 보유에서 빠지므로(RPC) 여기선 '없음' 으로 보인다.
function Coupons({ m }: { m: MemberRow }) {
  if (m.coupon_unused > 0)
    return (
      <span className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-wabi-fg">{m.coupon_unused}장</span>
        {m.coupon_next_expiry && (
          <span className="font-numeric text-xs text-wabi-fg-muted">
            ~ {formatDateKST(lastUsableIso(m.coupon_next_expiry))}
          </span>
        )}
      </span>
    );
  if (m.coupon_used > 0)
    return (
      <span className="text-wabi-fg-muted">
        사용함{m.coupon_used > 1 ? ` (${m.coupon_used}장)` : ""}
      </span>
    );
  return <span className="text-wabi-fg-muted">—</span>;
}

function Badges({ m }: { m: MemberRow }) {
  return (
    <>
      {m.role === "admin" && (
        <span className="rounded-full bg-wabi-fg px-2 py-0.5 text-[10px] text-wabi-bg">
          관리자
        </span>
      )}
      {!m.email_confirmed && (
        <span className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] text-amber-800">
          이메일 미인증
        </span>
      )}
    </>
  );
}

function Marketing({ value }: { value: boolean | null }) {
  if (value === null)
    return <span className="text-wabi-fg-muted">기록 없음</span>;
  return value ? (
    <span className="text-wabi-fg">동의</span>
  ) : (
    <span className="text-wabi-fg-muted">미동의</span>
  );
}

export function MemberList({ rows }: { rows: MemberRow[] }) {
  return (
    <>
      {/* 모바일 — 스택 카드 */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-wabi-border bg-wabi-bg/40 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-wabi-fg">
                  {m.name || "(닉네임 없음)"}
                </p>
                <p className="truncate text-xs text-wabi-fg-muted">
                  {m.email ?? "—"}
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Badges m={m} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-wabi-fg-muted">가입</dt>
              <dd className="flex flex-wrap items-center gap-1.5">
                <span className="font-numeric">{formatDateKST(m.joined_at)}</span>
                <Providers list={m.providers} />
              </dd>
              <dt className="text-wabi-fg-muted">최근 로그인</dt>
              <dd className="font-numeric">
                {m.last_sign_in_at ? formatDateKST(m.last_sign_in_at) : "—"}
              </dd>
              <dt className="text-wabi-fg-muted">마케팅 수신</dt>
              <dd>
                <Marketing value={m.marketing} />
              </dd>
              <dt className="text-wabi-fg-muted">쿠폰</dt>
              <dd>
                <Coupons m={m} />
              </dd>
              <dt className="text-wabi-fg-muted">구매</dt>
              <dd className="font-numeric">
                {m.orders > 0 ? `${m.orders}회 · ${won(m.amount)}` : "—"}
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      {/* 데스크톱 — 테이블 */}
      <div className="hidden sm:block">
        <TablePanel>
          <table className="w-full min-w-200 text-sm">
            <thead className="border-b border-wabi-border bg-wabi-subtle/50 text-left text-xs text-wabi-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">회원</th>
                <th className="px-4 py-3 font-medium">가입 방법</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium">최근 로그인</th>
                <th className="px-4 py-3 font-medium">마케팅 수신</th>
                <th className="px-4 py-3 font-medium">쿠폰</th>
                <th className="px-4 py-3 text-right font-medium">구매</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wabi-border">
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="max-w-64 px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-wabi-fg">
                        {m.name || "(닉네임 없음)"}
                      </span>
                      <Badges m={m} />
                    </span>
                    <span className="block truncate text-xs text-wabi-fg-muted">
                      {m.email ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Providers list={m.providers} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-numeric text-wabi-fg-muted">
                    {formatDateKST(m.joined_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-numeric text-wabi-fg-muted">
                    {m.last_sign_in_at ? formatDateKST(m.last_sign_in_at) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    <Marketing value={m.marketing} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Coupons m={m} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-numeric">
                    {m.orders > 0 ? (
                      <>
                        <span className="text-wabi-fg-muted">{m.orders}회 · </span>
                        <span className="font-medium text-wabi-fg">
                          {won(m.amount)}
                        </span>
                      </>
                    ) : (
                      <span className="text-wabi-fg-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      </div>
    </>
  );
}
