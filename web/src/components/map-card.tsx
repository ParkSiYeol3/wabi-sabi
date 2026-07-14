import { ExternalLink } from "lucide-react";
import { NaverMap } from "@/components/naver-map";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { site } from "@/lib/site";

// 매장 위치 (#110 → #119 대표님 피드백 반영)
//  - 지도 칸에는 네이버 지도가 상시 표시된다(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 필요).
//    키가 없거나 SDK/지오코딩이 실패하면 구글 임베드로 폴백 — 칸이 비지 않는다.
//  - 카카오맵·구글 지도는 아래 선택 링크.
//
// 검색 실패 대응: 상호+층/호+우편번호가 섞인 문자열은 네이버·카카오에서 검색이
// 실패한다. 링크는 도로명 주소(site.roadAddress)만 쓰고, 네이버는 아예 검색을
// 거치지 않고 등록된 플레이스 ID 로 직접 진입한다.
const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

const query = encodeURIComponent(site.roadAddress);

const links = [
  {
    label: "네이버 지도",
    href: `https://map.naver.com/p/entry/place/${site.naverPlaceId}`,
  },
  { label: "카카오맵", href: `https://map.kakao.com/?q=${query}` },
  {
    label: "구글 지도",
    href: `https://www.google.com/maps/search/?api=1&query=${query}`,
  },
];

export function MapCard({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="aspect-4/3 w-full overflow-hidden bg-wabi-muted">
        {NAVER_CLIENT_ID ? (
          <NaverMap clientId={NAVER_CLIENT_ID} />
        ) : (
          <GoogleMapEmbed />
        )}
      </div>

      <div className="mt-3 text-sm">
        <p className="font-medium">{site.place}</p>
        <p className="mt-0.5 text-wabi-fg-muted">
          {site.roadAddress} {site.addressDetail} ({site.postcode})
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {links.map((m) => (
          <li key={m.label}>
            <a
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline decoration-wabi-fg-muted/50 underline-offset-4 hover:decoration-wabi-fg"
            >
              {m.label}
              <ExternalLink className="size-3" strokeWidth={1.5} aria-hidden />
              <span className="sr-only">(새 창)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
