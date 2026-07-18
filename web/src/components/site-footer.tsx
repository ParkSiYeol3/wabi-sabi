import Link from "next/link";
import { site, business, legalNav } from "@/lib/site";

// 전자상거래법 §10 — 사업자 정보 표시 (#106).
// 아직 못 받은 값(개인정보보호책임자 등)은 빈 문자열이며, 여기서 걸러 렌더하지
// 않는다. 허위 정보 표시가 미표시보다 나쁘므로 임의로 채우지 말 것.
// 표기 방식은 무신사·컬리 관행(#199) — 파이프 구분 한 문단, 작은 저대비 글씨.
function businessParts(): string[] {
  const parts = [
    `상호 ${business.companyName}`,
    `대표 ${business.ceo}`,
    `주소 ${business.address}`,
    business.businessNumber && `사업자등록번호 ${business.businessNumber}`,
    business.mailOrderNumber && `통신판매업 ${business.mailOrderNumber}`,
    business.phone && `전화 ${business.phone}`,
    `이메일 ${business.email}`,
  ];
  return parts.filter((p): p is string => Boolean(p));
}

// 공정위 통신판매사업자 정보공개 팝업 — 무신사·컬리처럼 "사업자정보확인" 링크 제공.
function ftcUrl(): string | null {
  const digits = business.businessNumber.replace(/\D/g, "");
  return digits.length === 10
    ? `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${digits}`
    : null;
}

export function SiteFooter() {
  const ftc = ftcUrl();
  return (
    <footer className="mt-auto bg-wabi-footer text-white">
      <div className="mx-auto max-w-300 px-5 py-12">
        <div className="flex items-center gap-2">
          <span className="font-serif-jp text-base">わび-さび</span>
          <span className="text-xs tracking-[0.2em] text-white/70">
            {site.name}
          </span>
        </div>

        <nav
          className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/70"
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
          <a
            href={site.naverStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            네이버 스토어<span className="sr-only"> (새 창 열림)</span>
          </a>
          {legalNav.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              // 개인정보처리방침은 다른 고지와 구분되게 표시(관행·가독성)
              className={
                l.href === "/legal/privacy"
                  ? "font-medium text-white/90 hover:text-white"
                  : "hover:text-white"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* 사업자 정보 — 파이프 구분 한 문단, 눈에 띄지 않는 저대비 소자(무신사·컬리식) */}
        <address className="mt-7 text-[11px] leading-relaxed not-italic text-white/40">
          {businessParts().map((part, i) => (
            <span key={part} className="whitespace-nowrap">
              {i > 0 && <span className="mx-1.5 text-white/25">|</span>}
              {part}
            </span>
          ))}
          {ftc && (
            <span className="whitespace-nowrap">
              <span aria-hidden className="mx-1.5 text-white/25">
                |
              </span>
              <a
                href={ftc}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white/70"
              >
                사업자정보확인<span className="sr-only"> (새 창 열림)</span>
              </a>
            </span>
          )}
        </address>

        <p className="mt-3 text-[11px] text-white/40">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
