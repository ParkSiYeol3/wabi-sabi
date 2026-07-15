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
- **2026-07-05 재고 동시성(#56)**: migration 0010 — confirm_order_paid 재작성. 주문·상품 행 FOR UPDATE 잠금(상품은 id 순, 교착 방지) 후 재고 검증, 부족 시 cancelled+out_of_stock(토스 자동 취소·환불), 충분하면 정확 차감(greatest 클램프 제거 → 초과판매 차단). ConfirmResult.final 로 웹훅 무한 재시도 차단. 0010 적용·검증 완료(service_role 동작, anon 차단).
- **2026-07-05 주문 취소·환불(#57)**: migration 0011 cancel_paid_order RPC — paid→cancelled+재고 복원(FOR UPDATE, 멱등). lib/payments.cancelPaidOrder: RPC 먼저→토스 환불 나중(배송 경합 봉쇄). cancelMyOrder 액션+주문내역 취소 버튼(paid 만). 0011 적용·검증 완료.
- **2026-07-05 CSP Report-Only(#58)**: next.config CSP 헤더 — 토스 `*.tosspayments.com`·Supabase 허용, 그 외 'self'. 1단계 Report-Only + 위반 수집(`/api/csp-report`) → 프로드 위반 0 확인 후 강제 전환.
- **2026-07-05 Zod 1차(#60)·Dependabot(#63)**: 결제·주문 액션 스키마 검증(중복 상품 id 거부 포함), Dependabot 주간+CI audit(high+) 게이트.
- **2026-07-05 주문 쓰기 서버 전용화(#62, P0)**: 0012 — orders/order_items/gift_options 사용자 insert 회수, createPendingOrder 가 service_role 쓰기. order_items 직접 insert 로 주문 항목 조작하던 구멍 봉쇄. 0012 적용·실테스트 완료(insert 3종 42501 차단, SELECT·service_role 정상).
- **2026-07-05 계정별 서버 장바구니(#85)**: 0015 `cart_items`(본인 RLS). 비로그인=게스트 로컬 유지, 로그인 시 게스트 병합→서버 로드, 로그아웃 시 로컬 비움(계정 것 서버 보존). lib/cart-sync(product 조인·병합), store/cart write-through(낙관적), auth-provider가 SIGNED_IN만 병합(중복 방지). 저장은 product_id+quantity, 표시정보는 products 조인(가격 최신·비활성 자동 제외).
- **2026-07-05 어드민 감사로그(#78)**: 0013 `admin_audit_logs`(service_role 전용). 어드민 쓰기 액션 전부 기록(actor·action·target·diff), `/admin/audit` 조회.
- **2026-07-05 CSRF 점검·csp-report 가드(#81)**: Server Actions Origin 검사+SameSite=Lax 로 CSRF 안전 확인. `/api/csp-report` content-type 가드(스팸 차단).
- **2026-07-05 클라이언트 에러 로깅(#83)**: 0014 `client_error_logs`. global-error+onerror/unhandledrejection → `/api/log-error`(zod·rate limit), `/admin/errors` 조회. Sentry 전 공백 메우기.
- **2026-07-05 비밀번호 정책(#87)**: 가입 검증 6자 → 8자+영문·숫자 필수. 기존 계정 로그인 영향 없음.
- **2026-07-05 인스타그램 피드(#89, PR #90)**: About 피드 IG Graph API 실피드 전환(서버 컴포넌트, 1h ISR, 실패 시 플레이스홀더 폴백). next/image 프록시 → CSP 변경 불필요. 활성화엔 `INSTAGRAM_ACCESS_TOKEN`(Meta 장기 토큰 60일, user 발급) 필요.
- **2026-07-13 의존성 배치(#91~#95)**: minor 그룹 머지, 메이저 3종 ignore(ts7·eslint10·types/node26 — 각각 빌드/lint 실패·런타임 드리프트). @types/node 는 런타임(Node 24) 정렬로 직접 24.x 고정(PR #95).
- **2026-07-13 CSP 강제 전환(#58, PR #96)**: Report-Only → enforce(정책 동일, report-uri 유지). 위반 이제 실차단 — 결제·업로드·소셜로그인 프로드 수동 확인 권장.
- **2026-07-13 SEO(#16, PR #97)**: 기본 OG 이미지(ImageResponse)+상품 실사진 og:image+JSON-LD(OnlineStore·Product). sitemap·robots·metadata·next/image·next/font 감사 통과.
- **2026-07-15 주문·배송·문의 메일(#129·#133)**: Resend REST. 확정 RPC 가 `confirmed` 일 때만 발송(웹훅·성공페이지 이중 확정에도 1회). 문의 답변 메일은 **본문 미포함**(비밀글 유출 방지, 링크만). 키 미설정·실패해도 결제/저장은 정상.
- **2026-07-15 품절 표시(#131)**: 목록·홈 카드 품절 오버레이 + 담기 비활성(`stock` undefined 와 0 구분).
- **2026-07-15 주문 상세(#137)**: `/mypage/orders/[id]` — 송장번호·배송지·항목 전체·청약철회 마감일. 어드민이 저장한 송장을 고객이 볼 수 없던 문제. 타인 접근 → 404(RLS).
- **2026-07-15 리뷰 모더레이션(#141)**: 0022 reviews.hidden(soft-hide)+review_reports(신고자·사유·unique). 어드민 hard delete 만 가능했고 고객 신고 수단 없었음. **공개 read 를 hidden=false 로 교체 → 쿼리 변경 없이 DB 레벨 자동 제외(RLS-first)**. 신고 = 로그인 본인·자기 리뷰 신고 불가·중복 차단, review_reports select 정책 없음 → 신고자 신원 비공개. CodeRabbit 반영: 사유 enum 강제(Server Action 우회 차단)·0023 작성자 본인 숨김 리뷰 가시성 예외(재작성 silent-fail 해결). 검증: 숨김 anon 0·신고내역 anon []·자기외 insert 401.
- **2026-07-15 죽은 도메인 링크 제거(#135)**: `wasa.kr` 은 **미등록 도메인**인데 7곳에 하드코딩 → sitemap·robots·메일 링크가 전부 접속 불가 URL. `lib/site-url.ts` `SITE_URL`(server-only, 프로토콜 정규화) 단일 출처.
- **2026-07-15 배송완료 처리(#124)**: 0020 `orders.delivered_at`. delivered 로 가는 경로가 없어 모든 주문이 영구 "배송 중"이었고, 청약철회 7일 기산점(수령일)도 없었다. 어드민 배송완료 버튼+감사로그, 송장 수정으로 상태 되돌아감 방지. **날짜는 `formatDateKST`(Asia/Seoul 고정) — 서버가 UTC라 법적 기산점이 하루 어긋날 수 있었다.**
- **2026-07-15 리뷰 구매 검증(#126)**: 0021 — RLS insert 정책이 `auth.uid()=user_id` 만 봐서 **미구매자가 PostgREST 직접 insert 로 리뷰 작성 가능(실측 201)**. 구매 조건(paid·shipping·delivered 주문에 해당 상품) 추가 → 재공격 시 403 차단. 미결제 주문 우회도 봉쇄.
- **2026-07-14 지도 렌더 수정(#119, PR #122)**: 실키 투입 후 3겹 실패 해결 — geocoder 서브모듈 지연 로드(Service undefined) · **CSP 가 지도 스타일 JSON(JSONP script)을 차단해 타일 0장** · Geocoding API 미등록(403, NCP 에서 추가). 프로드 검증(1회 세션): 지오코딩 200·타일 렌더·폴백 0·해당 세션 CSP 위반 리포트 0건. **외부 SDK + CSP 는 로컬(http) 결과를 프로드에 대입하면 안 됨 — SDK 가 출처별로 다른 호스트/스킴을 쓴다. 최종 확인은 https 배포 환경에서.**
- **2026-07-14 지도(#119)**: 네이버 지도 상시 임베드(Maps SDK + Geocoder). 검색 실패 원인 = 상호+층/호+우편번호 섞인 쿼리 → `site.roadAddress` 분리, 네이버는 플레이스 ID 직접 진입. 키 없거나 실패 시 구글 임베드 폴백. CSP 에 지도 출처 추가. 👤 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`(NCP 무료) 필요.
- **2026-07-14 회원탈퇴(#113)**: 0018 — `inquiries.user_id` cascade→set null(분쟁기록 3년 보존, 방침과 충돌 해소). 탈퇴 시 계정·배송지·위시리스트·장바구니·리뷰 삭제, 주문(5년)·문의(3년)는 익명화 보존, 뉴스레터 동반 파기. "회원탈퇴" 타이핑 + 진행중 주문 차단.
- **2026-07-14 뉴스레터 수신거부·어드민(#116)**: 0019 `unsubscribe_token`(uuid — 이메일 링크는 임의 해지 위험). `/newsletter/unsubscribe?token=`(비로그인·noindex), `/admin/newsletter` 목록. 재구독 시 토큰 유지(기발송 메일 링크 생존).
- **2026-07-13 홈 Featured 실상품(#104)**: 하드코딩 더미 배열 → `getFeaturedProducts`(is_monthly 우선, 부족분 최신 폴백). 어드민 상품 변경이 홈에 반영되지 않던 원인.
- **2026-07-13 법적고지 3종(#106)**: `/legal/terms·privacy·refund` + 푸터 사업자정보(`site.business`). 사업자등록번호 등 미입력 값은 렌더 생략 — 허위 표시 방지. 👤 대표님 입력 필요.
- **2026-07-13 뉴스레터(#108)**: 0017 `newsletter_subscribers`(service_role 전용). action 없던 껍데기 폼 → 서버 액션(동의 서버 재검증·동의시각·rate limit·upsert 멱등)+useActionState. 실브라우저 E2E·RLS 실측 완료.
- **2026-07-13 매장 위치 카드(#110)**: "Map will be here" → 주소+지도앱 바로가기(키·CSP 불필요). Contact dl 마크업 위반도 수정(a11y 100).
- **2026-07-13 Rate limit(#101, PR #102)**: `lib/rate-limit.ts` — Upstash Redis(env 있을 때)/인메모리(폴백) 2단. log-error 10/분·csp-report 20/분(IP), 문의 5/시간(user.id). 무인증 DB insert 남용·게시판 도배 차단. Redis 장애 시 fail-open.
- **2026-07-13 Lighthouse 1차(#16, PR #99)**: 프로드 실측(홈 89·shop 71·상품 77) → shop 첫줄 카드 priority(LCP)·홈 dl→ul(a11y 100)·상품 meta description 빈값 버그(`??`→`||`). nonce 전환은 전 페이지 동적 렌더 강제라 정식 배포 후로 보류(#16 코멘트).

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
