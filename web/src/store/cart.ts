import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  upsertServerItem,
  removeServerItem,
  clearServerCart,
  enqueueCartWrite,
} from "@/lib/cart-sync";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  // 로그인 사용자 id — 있으면 조작을 서버에 write-through(낙관적). 없으면 게스트(로컬).
  userId: string | null;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  // 계정 연동 — auth-provider 가 호출. 서버 병합·로드 결과로 로컬 교체.
  bindUser: (userId: string, items: CartItem[]) => void;
  // 로그아웃 — 로컬만 비움(계정 장바구니는 서버 보존).
  unbindUser: () => void;
}

// 장바구니 (WSB-013). 비로그인=게스트 로컬(localStorage), 로그인=서버 동기화(0015).
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,
      add: (item, qty = 1) => {
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: Math.min(i.quantity + qty, 99) }
                  : i,
              ),
            };
          }
          // 신규 항목도 상한 99 (서버는 upsert 시 clamp 되므로 로컬과 맞춤).
          return {
            items: [...s.items, { ...item, quantity: Math.min(qty, 99) }],
          };
        });
        const { userId, items } = get();
        if (userId) {
          const next = items.find((i) => i.id === item.id)?.quantity ?? qty;
          void enqueueCartWrite(userId, () =>
            upsertServerItem(userId, item.id, next),
          );
        }
      },
      remove: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        const { userId } = get();
        if (userId)
          void enqueueCartWrite(userId, () => removeServerItem(userId, id));
      },
      setQty: (id, qty) => {
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.id !== id)
              : s.items.map((i) =>
                  i.id === id ? { ...i, quantity: Math.min(qty, 99) } : i,
                ),
        }));
        const { userId } = get();
        if (userId)
          void enqueueCartWrite(userId, () => upsertServerItem(userId, id, qty));
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
      // userId 는 영속하지 않음 — 세션에서 파생(auth-provider). items 만 게스트 캐시.
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

// 셀렉터
// 헤더 배지 = 장바구니에 담긴 "상품 종류 수" (주문 수량 합계 아님 — 대표님/운영 피드백).
export const cartCount = (s: CartState) => s.items.length;
export const cartTotal = (s: CartState) =>
  s.items.reduce((n, i) => n + i.price * i.quantity, 0);
