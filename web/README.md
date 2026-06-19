# WABI-SABI Web (wasa.kr)

와비사비 온라인 스토어 프론트엔드. 상위 기획·디자인·종합기록은 프로젝트 루트의
`WABI-SABI_프로젝트_브리핑.md` · `DESIGN_SYSTEM.md` · `개발_진행기록.md` 참조.

> 이 README = 개발 상시 로그. 진행사항 생길 때마다 갱신.

## 스택
Next.js 16.2.9 (App Router, Turbopack) · React 19.2.4 · TypeScript · Tailwind v4 ·
shadcn/ui(stone) · Supabase(@supabase/ssr) · Zustand · next/font(Noto Sans KR + Noto Serif JP)

## 시작하기
```bash
npm install
cp .env.example .env.local   # Supabase 키 입력
npm run dev                  # http://localhost:3000
npm run build                # 프로덕션 빌드 검증
```
`.env.local` 비어 있어도 dev 동작 (proxy/AuthProvider가 Supabase 미설정 시 스킵).

## 구조
```
src/
  app/            page(홈)·shop·about·contact·cart·auth + layout·globals.css
  components/     site-header, site-footer, container, product-card, auth-provider, ui/*(shadcn)
  lib/            site.ts(브랜드·nav 상수) · supabase/{client,server,proxy} · utils(cn)
  store/          auth.ts (Zustand)
  proxy.ts        Next16 proxy (세션 갱신, env 없으면 스킵)
supabase/         migrations/{0001_init,0002_rls}.sql · seed.sql
```

## 진행 로그
- **2026-06-18 기반 셋업**: create-next-app, Supabase 클라이언트 3종, Zustand 인증, 디자인토큰, DB 마이그레이션+RLS+seed. 빌드·타입체크 통과.
- **2026-06-18 패키지**: shadcn/ui 수동 구성(stone), button/input/card.
- **2026-06-18 UI 퍼블리싱**: 공통 헤더/푸터, Container·ProductCard, 페이지 6종(홈·shop·about·contact·cart·auth) 시안대로 구현. 상품은 플레이스홀더(Supabase 연동 전).
- **2026-06-18 SEO·에러처리**: not-found(404)·error 바운더리·robots.ts·sitemap.ts 추가. 11라우트 빌드.
- **2026-06-18 GitHub 준비**: 루트로 git 통합(.env 미추적 확인), gh CLI 설치. .github PR/이슈 템플릿, docs/github-issues-plan.md(WSB 이슈 16건).
- **2026-06-19 GitHub 연동 완료**: repo `ParkSiYeol3/wabi-sabi`(private) 생성·push. 라벨 10종 + WSB 이슈 16건(#1~#16) 등록. PR 흐름 시연 → #17(a11y 스킵 링크, feat/a11y-skip-link, OPEN).
- **2026-06-19 CI·코드리뷰**: GitHub Actions `ci.yml`(PR마다 ESLint+tsc+build, Node22) — main·#17 통과. CodeRabbit `.coderabbit.yaml`(한국어 자동 리뷰, 보안·a11y·성능 중점). 앱 설치·동작 확인(#17 리뷰 완료). PR #17 머지.
- **2026-06-19 장바구니(WSB-013, #9)**: Zustand 영속 store(`store/cart.ts`, localStorage), AddToCartButton, 헤더 수량 배지(useSyncExternalStore 수화가드), /cart 라인아이템(수량/삭제/합계). 비회원 가능. lint·build 통과. → #18 머지.
- **2026-06-19 Supabase 실연동 시작**: .env.local 채움(URL+publishable anon key), apply_all.sql로 8테이블+RLS+카테고리 시드 적용(검증: categories 4·orders RLS 빈배열). seed_products.sql 샘플 상품 8.
- **2026-06-19 상품조회(WSB-007, #3)**: `lib/queries/products.ts` 서버 조회, /shop을 실 DB 조회+카테고리 필터(searchParams, 동적 라우트)로 교체, 빈 상태 처리. 플레이스홀더 제거.

## 라우트
| 경로 | 내용 | 상태 |
|------|------|------|
| `/` | 홈(Hero·Featured·Philosophy·Values·Visit·Newsletter) | ✅ UI |
| `/shop` | 카테고리 필터 + 상품 그리드 | ✅ UI / 데이터 TODO(WSB-007) |
| `/about` | Philosophy + Our Values | ✅ UI |
| `/contact` | Visit Us 정보 | ✅ UI |
| `/cart` | 빈 장바구니 | ✅ UI / 로직 TODO(WSB-013) |
| `/auth` | 로그인·회원가입 탭 카드 | ✅ UI / Supabase TODO(WSB-001/003) |

## 미해결 (블로커)
1. Supabase 프로젝트 미생성 → `.env.local` 빈값. DB·인증 실가동 불가.
2. 휴무일 = **수요일**(디자인 시안 채택, 브리핑 "일요일"과 충돌).
3. 결제 PG 미정(토스/포트원).
4. categories/wishlist/addresses 컬럼 확정 필요.

## 다음 작업
Supabase 프로젝트 생성 → 마이그레이션 적용 → 상품 데이터 연동(WSB-007) → 인증 연동(WSB-001/003).
보안/QA/성능은 각 기능 구현 시 동반 점검(RLS·입력검증·이미지최적화·접근성).
