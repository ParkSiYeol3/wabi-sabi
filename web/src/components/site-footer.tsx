import Link from "next/link";
import { site, business, legalNav } from "@/lib/site";

// 전자상거래법 §10 — 사업자 정보 표시 (#106).
// 아직 못 받은 값(사업자등록번호 등)은 빈 문자열이며, 여기서 걸러 렌더하지 않는다.
// 허위 정보 표시가 미표시보다 나쁘므로 임의로 채우지 말 것.
function businessLines(): string[] {
  const lines = [
    `상호 ${business.companyName}`,
    `대표 ${business.ceo}`,
    business.businessNumber && `사업자등록번호 ${business.businessNumber}`,
    business.mailOrderNumber && `통신판매업신고 ${business.mailOrderNumber}`,
    `주소 ${business.address}`,
    business.phone && `전화 ${business.phone}`,
    `이메일 ${business.email}`,
  ];
  return lines.filter((l): l is string => Boolean(l));
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-wabi-footer text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="font-serif-jp text-base">わび-さび</span>
          <span className="text-xs tracking-[0.2em] text-white/70">
            {site.name}
          </span>
        </div>
        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/70"
          aria-label="고객 안내"
        >
          <Link href="/notice" className="hover:text-white">
            공지사항
          </Link>
          <Link href="/inquiry" className="hover:text-white">
            문의
          </Link>
          <Link href="/review" className="hover:text-white">
            리뷰
          </Link>
          {legalNav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              // 개인정보처리방침은 다른 고지와 구분되게 표시(관행·가독성)
              className={
                l.href === "/legal/privacy"
                  ? "font-medium text-white hover:text-white"
                  : "hover:text-white"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <address className="mt-8 space-y-1 text-xs not-italic text-white/50">
          {businessLines().map((line) => (
            <p key={line}>{line}</p>
          ))}
        </address>

        <p className="mt-6 text-xs text-white/50">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
