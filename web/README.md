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
- **2026-06-19 상품조회(WSB-007, #3)**: `lib/queries/products.ts` 서버 조회, /shop을 실 DB 조회+카테고리 필터(searchParams, 동적 라우트)로 교체, 빈 상태 처리. 플레이스홀더 제거. → #19 머지. 샘플 상품 8 시드 확인.
- **2026-06-19 인증(WSB-001/003, #2)**: /auth 폼 → Supabase signInWithPassword/signUp 연결. 비번 확인·길이 검증, 에러/확인메일 안내, redirect 파라미터(useSearchParams+Suspense), 가입 시 name→profiles 트리거. → #20 머지. (메모: dev에선 Supabase "Confirm email" OFF 권장 — 내장메일 rate limit 회피.)
- **2026-06-19 상품상세(WSB-010, #6)**: `/shop/[id]` 동적 라우트, `getProduct` 단건조회, 이미지갤러리·가격·설명·스펙(소재/사이즈/주의), 수량선택+장바구니/바로구매(재고한도), generateMetadata, 없으면 notFound. next.config remotePatterns(Supabase Storage). 실상품 렌더·404 확인. → #21 머지.
- **2026-06-19 마이페이지·로그아웃(WSB-004, #11)**: `/mypage` 보호 라우트(미로그인→/auth redirect), 내 정보(이메일·이름수정), 배송지 CRUD(추가/삭제, Server Actions+RLS), 로그아웃 버튼. 헤더 user 아이콘 로그인 시 /mypage(수화 가드). 주문내역(#12)·위시리스트(#8)는 준비중 표기. → #22 머지.
- **2026-06-19 검색·정렬(WSB-008/009, #4/#5)**: getProducts에 q(ilike)·sort(신상/낮은가격/높은가격) 추가. /shop 검색 폼·정렬 링크·카테고리(파라미터 상호 유지). 검색·정렬 동작 확인. → #23 머지.
- **2026-06-19 위시리스트(WSB-006/011, #8)**: WishlistButton(클라이언트 토글, 낙관적, 비로그인→/auth), 상세 페이지 하트(서버 초기상태), /mypage/wishlist 목록(해제 시 refresh). RLS 본인. → #24 머지.
- **2026-06-19 관련상품(WSB-012, #7)**: 상세 하단 같은 카테고리 추천(자기 제외 4). → #25 머지.
- **2026-06-20 주문내역(WSB-005, #12)**: /mypage/orders 보호, 주문 목록(번호·일시·상태·금액·대표상품), lib/orders 상태라벨. → #26 머지.
- **2026-06-20 체크아웃 UI(WSB-014~019, #10)**: /checkout 클라이언트(로그인·장바구니 가드), 배송지 폼·선물포장(+메시지카드)·주문요약·합계. 결제 버튼은 토스페이먼츠 연동 전 안내(실 결제·주문생성은 후속). → #27 머지.
- **2026-06-20 소셜로그인(WSB-002, #15)**: /auth 카카오·구글 버튼 + /auth/callback(code→세션). provider 활성화는 대시보드. → #29 머지.
- **2026-06-20 어드민(WSB-023~026, #14)**: /admin 가드(ADMIN_EMAILS env), 상품 CRUD·재고·노출, 주문 조회·송장 입력. 쓰기는 service_role 클라이언트(lib/supabase/admin) — 키 미설정 시 안내. RLS 우회는 서버 전용.
- **2026-06-20 토스 결제(WSB-014~019, #10)**: @tosspayments/tosspayments-sdk. createPendingOrder(서버, DB 가격 재검증·재고확인→orders/order_items/gift_options insert) → /checkout/success(토스 confirm API 승인 검증 → confirm_order RPC: paid+재고차감) / /checkout/fail. 마이그레이션 0003(insert 정책+RPC). **실행 전: 0003 적용 + .env.local 토스 test키 필요.** 운영 전 웹훅·service_role 확정 TODO.
- **2026-06-21 결제위젯 전환(#10)**: 결제창(redirect) → **결제위젯**(인페이지 결제수단+약관 UI). widgets.renderPaymentMethods/renderAgreement, setAmount(금액 변경 시 갱신), requestPayment. 실 사업용 — test키로 개발, 가맹점 계약 후 라이브키 교체.
- **2026-07-05 재고 동시성(#56)**: migration 0010 — confirm_order_paid 재작성. 주문·상품 행 FOR UPDATE 잠금(상품은 id 순, 교착 방지) 후 재고 검증, 부족 시 cancelled+out_of_stock(토스 자동 취소·환불), 충분하면 정확 차감(greatest 클램프 제거 → 초과판매 차단). ConfirmResult.final 로 웹훅 무한 재시도 차단. **SQL Editor 에서 0010 적용 필요.**

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
