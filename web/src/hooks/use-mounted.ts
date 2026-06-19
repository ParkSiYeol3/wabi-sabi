import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// localStorage 영속 store(zustand persist)를 SSR과 함께 쓸 때
// 서버(빈 상태) vs 클라이언트(복원 상태) 불일치(hydration mismatch) 방지용.
// useSyncExternalStore: 서버 스냅샷=false, 클라이언트=true → effect/setState 불필요.
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
