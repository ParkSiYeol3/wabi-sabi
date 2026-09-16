import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  upsertServerItem,
  removeServerItem,
  clearServerCart,
  enqueueCartWrite,
} from "@/lib/cart-sync";
import { cartLineKey } from "@/lib/cart-line";
import type { SelectedOption } from "@/lib/product-options";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
  // 라인 단위 추가 옵션 코드(#253).
  addons: string[];
  // 라인이 고른 커스텀 옵션(색상·모양 등, 0048).
  options: SelectedOption[];
  // 줄의 신원(#677) — 상품 id + 옵션 + 애드온 조합. 같은 상품이라도 옵션이 다르면
  // 다른 줄이다. 삭제·수량 변경·서버 동기화가 모두 이 키를 가리킨다.
  lineKey: string;
}

interface CartState {
  items: CartItem[];
  // 로그인 사용자 id — 있으면 조작을 서버에 write-through(낙관적). 없으면 게스트(로컬).
  userId: string | null;
  add: (
    item: Omit<CartItem, "quantity" | "addons" | "options" | "lineKey">,
    qty?: number,
    addons?: string[],
    options?: SelectedOption[],
  ) => void;
  remove: (lineKey: string) => void;
  setQty: (lineKey: string, qty: number) => void;
  clear: () => void;
  // 계정 연동 — auth-provider 가 호출. 서버 병합·로드 결과로 로컬 교체.
  bindUser: (userId: string, items: CartItem[]) => void;
  // 로그아웃 — 로컬만 비움(계정 장바구니는 서버 보존).
  unbindUser: () => void;
}

// 장바구니 (WSB-013). 비로그인=게스트 로컬(localStorage), 로그인=서버 동기화(0015).
// 줄 구분은 lineKey(#677, 0064) — 옵션이 다르면 다른 줄로 쌓인다.
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,
      add: (item, qty = 1, addons = [], options = []) => {
        const lineKey = cartLineKey(item.id, options, addons);
        set((s) => {
          const existing = s.items.find((i) => i.lineKey === lineKey);
          if (existing) {
            // 옵션까지 똑같은 줄을 또 담은 것 → 수량만 더한다.
            return {
              items: s.items.map((i) =>
                i.lineKey === lineKey
                  ? { ...i, quantity: Math.min(i.quantity + qty, 99) }
                  : i,
              ),
            };
          }
          // 신규 항목도 상한 99 (서버는 upsert 시 clamp 되므로 로컬과 맞춤).
          return {
            items: [
              ...s.items,
              {
                ...item,
                quantity: Math.min(qty, 99),
                addons,
                options,
                lineKey,
              },
            ],
          };
        });
        const { userId, items } = get();
        if (userId) {
          const next = items.find((i) => i.lineKey === lineKey)?.quantity ?? qty;
          void enqueueCartWrite(userId, () =>
            upsertServerItem(userId, lineKey, item.id, next, addons, options),
          );
        }
      },
      remove: (lineKey) => {
        set((s) => ({ items: s.items.filter((i) => i.lineKey !== lineKey) }));
        const { userId } = get();
        if (userId)
          void enqueueCartWrite(userId, () => removeServerItem(userId, lineKey));
      },
      setQty: (lineKey, qty) => {
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.lineKey !== lineKey)
              : s.items.map((i) =>
                  i.lineKey === lineKey
                    ? { ...i, quantity: Math.min(qty, 99) }
                    : i,
                ),
        }));
        const { userId, items } = get();
        if (userId) {
          const line = items.find((i) => i.lineKey === lineKey);
          void enqueueCartWrite(userId, () =>
            upsertServerItem(
              userId,
              lineKey,
              line?.id ?? lineKey.split("::")[0],
              qty,
              line?.addons ?? [],
              line?.options ?? [],
            ),
          );
        }
      },
      clear: () => {
        const { userId } = get();
        set({ items: [] });
        if (userId)
          void enqueueCartWrite(userId, () => clearServerCart(userId));
      },
      bindUser: (userId, items) => set({ userId, items }),
      unbindUser: () => set({ userId: null, items: [] }),
    }),
    {
      name: "wabi-cart",
      // userId 는 영속하지 않음 — 세션에서 파생(auth-provider). items 는 "게스트 캐시"만.
      // 로그인 상태에선 items 를 저장하지 않는다(빈 배열로 영속) — 서버가 진실이므로.
      // 저장하면 bindUser 가 넣어둔 "서버 카트 사본"이 다음 마운트에서 게스트 카트로
      // 오인돼 mergeGuestCart 가 자기 자신을 재병합, 로그인/새로고침마다 수량이
      // 배가되어 99(상한)까지 쌓였다(대표님 제보 버그). 게스트일 때만 로컬 캐시한다.
      partialize: (s) => ({ items: s.userId ? [] : s.items }),
      // #677 이전에 저장된 게스트 장바구니엔 lineKey 가 없다 — 열자마자 삭제·수량
      // 변경이 먹통이 되지 않게 복원 시 채워 넣는다.
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { items?: CartItem[] } | undefined;
        if (!state?.items) return { items: [] } as { items: CartItem[] };
        return {
          items: state.items.map((i) => ({
            ...i,
            lineKey: i.lineKey ?? cartLineKey(i.id, i.options, i.addons),
          })),
        } as { items: CartItem[] };
      },
    },
  ),
);

// 셀렉터
// 헤더 배지 = 장바구니에 담긴 "상품 종류 수" (주문 수량 합계 아님 — 대표님/운영 피드백).
export const cartCount = (s: CartState) => s.items.length;
export const cartTotal = (s: CartState) =>
  s.items.reduce((n, i) => n + i.price * i.quantity, 0);
