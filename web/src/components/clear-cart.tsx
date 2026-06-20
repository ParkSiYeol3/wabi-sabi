"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

// 결제 성공 시 장바구니 비우기 (클라이언트 store)
export function ClearCart() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
