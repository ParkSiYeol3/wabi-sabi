import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { StoneGarden } from "@/components/garden/stone-garden";
import { getTodayStones, kstDateKey } from "@/lib/queries/garden";
import { placeStones } from "@/lib/garden-layout";

export const metadata: Metadata = {
  title: "돌의 정원",
  description:
    "물 없이 물을 그리는 마당, 가레산스이. 오늘 놓인 그릇을 앉은 자리에서 천천히 둘러보세요.",
};

// 돌의 정원 (#616, 대표님) — 우리 몰만의 자리.
//
// 대표님이 원한 것: "팔지만 파는 듯하지 않은 편안함". 가레산스이는 구조가 이미
// 그렇다 — 들어가는 정원이 아니라 앉아서 보는 정원이라 소유가 아니라 응시가 된다.
// 그래서 이 화면엔 가격도, 담기도, 재촉하는 문구도 없다. 한 번 누르면 이름만
// 떠오르고, 정말 궁금한 손님만 한 번 더 눌러 상세로 나간다.
//
// 배치는 날짜로 정해진다(一期一会) — 오늘의 정원은 오늘만의 것이고, 내일 오면
// 다른 그릇이 다른 자리에 놓인다.
export default async function GardenPage() {
  const stones = await getTodayStones();
  const placed = placeStones(stones, kstDateKey());

  return (
    <div className="pb-16">
      <Container className="pt-3">
        <h1 className="text-lg font-semibold tracking-wide sm:text-xl">
          돌의 정원
        </h1>
        <p className="mt-3 max-w-2xl text-xs leading-6 text-wabi-fg-muted">
          가레산스이(枯山水)는 물 없이 물을 그리는 마당입니다. 모래는 물이 되고
          돌은 섬이 됩니다. 들어가지 않고, 마루에 앉아 바라봅니다.
        </p>
        <p className="mt-1.5 text-xs leading-6 text-wabi-fg-muted">
          오늘 놓인 그릇입니다. 옆으로 밀어 둘러보세요.
        </p>
      </Container>

      {/* 정원은 화면 폭을 다 쓴다 — 컨테이너 안에 가두면 마당이 상자가 된다. */}
      <div className="mt-6 sm:mt-8">
        {placed.length > 0 ? (
          // 한 화면에 다 담기지 않아야 "둘러본다". 모바일은 폭이 좁아 더 길게 잡는다.
          <StoneGarden stones={placed} width="min(320vw, 2600px)" />
        ) : (
          <div className="garden-sand flex h-[46vh] items-center justify-center">
            <p className="text-xs text-wabi-fg-muted">
              오늘은 마당이 비어 있습니다.
            </p>
          </div>
        )}
      </div>

      <Container className="mt-8">
        <p className="text-center text-xs leading-6 text-wabi-fg-muted">
          오래 앉아 계셔도 좋습니다.
        </p>
        <p className="mt-6 text-center">
          <Link
            href="/shop"
            className="text-xs text-wabi-fg-muted underline underline-offset-4 transition-colors hover:text-wabi-fg"
          >
            상점 둘러보기 →
          </Link>
        </p>
      </Container>
    </div>
  );
}
