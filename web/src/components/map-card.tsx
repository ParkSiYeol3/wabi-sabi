import { MapPin, ExternalLink } from "lucide-react";
import { site } from "@/lib/site";

// 매장 위치 카드 (#110) — 홈·Contact 의 "Map will be here" 플레이스홀더 대체.
//
// 지도 SDK 임베드(카카오·네이버)는 API 키(👤 대표님 자원)와 CSP script-src·frame-src
// 허용목록 확장이 필요하다. 키 없이도 방문객이 길을 찾을 수 있어야 하므로, 우선
// 주소 + 지도 앱 바로가기(외부 링크)로 실용 가치를 채운다. 키를 받으면 이 카드 안을
// 실제 지도로 교체하면 된다 — 호출부(page/contact)는 바뀌지 않는다.
const QUERY = encodeURIComponent(`${site.place} ${site.address}`);

const mapLinks = [
  { label: "네이버 지도", href: `https://map.naver.com/p/search/${QUERY}` },
  { label: "카카오맵", href: `https://map.kakao.com/?q=${QUERY}` },
  {
    label: "구글 지도",
    href: `https://www.google.com/maps/search/?api=1&query=${QUERY}`,
  },
];

export function MapCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex aspect-4/3 flex-col items-center justify-center gap-4 bg-wabi-muted px-6 text-center ${className}`}
    >
      <MapPin className="size-7 text-wabi-fg-muted" strokeWidth={1.5} aria-hidden />
      <div className="text-sm">
        <p className="font-medium">{site.place}</p>
        <p className="mt-1 text-wabi-fg-muted">{site.address}</p>
      </div>
      <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        {mapLinks.map((m) => (
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
