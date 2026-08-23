import Link from "next/link";
import { site, business, legalNav, MONTHLY_SLUG } from "@/lib/site";
import { getCategoryTree } from "@/lib/queries/categories";
import { LogoutButton } from "@/components/account/logout-button";

// 전자상거래법 §10 — 사업자 정보 표시 (#106).
// 아직 못 받은 값(개인정보보호책임자 등)은 빈 문자열이며, 여기서 걸러 렌더하지
// 않는다. 허위 정보 표시가 미표시보다 나쁘므로 임의로 채우지 말 것.
function businessLines(): string[] {
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

// 공정위 통신판매사업자 정보공개 팝업 — 무신사·컬리처럼 "사업자정보확인" 링크.
function ftcUrl(): string | null {
  const digits = business.businessNumber.replace(/\D/g, "");
  return digits.length === 10
    ? `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${digits}`
    : null;
}

type FooterLink = { label: string; href: string };

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="min-w-28">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/40">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-[13px] text-white/70 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 푸터 — 좌측에 사이트의 모든 분류 페이지를 한눈에 나열, 우측에 사업자 정보를
// 붙인다(대표님 피드백, tableofcraft 참고). 카테고리는 DB(getCategoryTree)에서.
export async function SiteFooter() {
  const ftc = ftcUrl();
  const tree = await getCategoryTree();

  // 상품 열: 전체 상품 → 월간 그릇 → 대분류들.
  const shopLinks: FooterLink[] = [
    { label: "전체 상품", href: "/shop" },
    { label: "월간 그릇", href: `/shop?category=${MONTHLY_SLUG}` },
    ...tree.map((c) => ({ label: c.ko, href: `/shop?category=${c.slug}` })),
  ];
  // 안내 열: SHOWROOM(소개=오시는 길 합침) + 고객 게시판. 마이페이지(대표님 —
  // 하단바=푸터에 마이페이지)는 항상 노출하되, 비회원이 눌러도 /mypage 가 로그인으로
  // 자동 유도(리다이렉트)하므로 별도 판정 없이 링크만 둔다.
  const guideLinks: FooterLink[] = [
    { label: "마이페이지", href: "/mypage" },
    { label: "SHOWROOM", href: "/about" },
    { label: "오늘의 와비사비", href: "/today" },
    { label: "공지사항", href: "/notice" },
    { label: "문의", href: "/inquiry" },
    { label: "리뷰", href: "/review" },
    { label: "비회원 주문조회", href: "/order-lookup" },
  ];

  return (
    <footer className="mt-auto bg-wabi-footer text-white">
      <div className="mx-auto max-w-300 px-5 py-14">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          {/* 좌측 — 모든 분류 페이지 한눈에 */}
          <nav
            className="flex flex-wrap gap-x-12 gap-y-10"
            aria-label="사이트 안내"
          >
            <LinkColumn title="상품" links={shopLinks} />
            <LinkColumn title="안내" links={guideLinks} />
            <LinkColumn title="약관" links={[...legalNav]} />
          </nav>

          {/* 우측 — 브랜드 + 사업자 정보 */}
          <div className="lg:text-right">
            <div className="flex items-center gap-2 lg:justify-end">
              <span className="font-serif-jp text-base">わび-さび</span>
              <span className="text-xs tracking-[0.2em] text-white/70">
                {site.name}
              </span>
            </div>
            {/* 로그아웃 — 로그인 시에만(빨간 글씨, 대표님). 클라이언트 자체 판정 */}
            <div className="mt-3 lg:flex lg:justify-end">
              <LogoutButton variant="link" />
            </div>
            <address className="mt-5 space-y-1 font-numeric text-[11px] not-italic leading-relaxed text-white/40">
              {businessLines().map((line) => (
                <p key={line}>{line}</p>
              ))}
              {ftc && (
                <p>
                  <a
                    href={ftc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-white/70"
                  >
                    사업자정보확인<span className="sr-only"> (새 창 열림)</span>
                  </a>
                </p>
              )}
            </address>
            <p className="mt-4 font-numeric text-[11px] text-white/40">
              © {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
