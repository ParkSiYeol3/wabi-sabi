# WABI-SABI 디자인 시스템

> Figma 보드 `te2FQ9BTmVogmqnzUihEUH` ("와비사비 웹 사이트", FigJam)에서 추출.
> 보드는 이미지 기반 무드/레퍼런스 보드라 디자인 토큰이 구조화돼 있지 않음 → 시안 이미지에서 수동 도출함.
> 추출일: 2026-06-18 · **최종 갱신: 2026-07-17**(시열님 방향 — 애플식 스크롤 인터랙션 반영)

---

## 1. 디자인 방향

흑백 미니멀 + 웜그레이(warm gray). 여백 넓음, 제품 사진이 주인공. 절제된 타이포. 와비-사비 미학(불완전·무상·단순)을 UI 절제로 표현.

**2026-07-17 방향 추가 (시열님)**: 애플 제품 페이지(airpods-max/pro/4) 수준의 **스크롤 인터랙션**. 정적인 화면이 아니라 스크롤에 반응해 요소가 등장하고 깊이가 생기는 경험. 단 브랜드 톤(차분·절제)을 깨지 않는 선에서 — 화려함이 아니라 **무게감 있는 등장**.

시안에서 확인된 페이지/섹션:
- **Home**: 풀블리드 제품사진 히어로(わび-さび 대형 + WABI-SABI + Living Select Shop + SEE MORE) → Featured Collection(4열 카드) → Philosophy → Visit Us → Newsletter → Footer
- **Shop**: 상단 필터바(카테고리/색상/가격 정렬) + 4열 상품 그리드(사진·카테고리·상품명·₩가격) + 페이지네이션
- **About**: 철학 Philosophy(텍스트+이미지 2분할) + Our Values(3열: Imperfection / Simplicity / Authenticity)
- **Visit Us**: 영업시간·위치·인스타·문의 2분할 + 지도
- **Footer**: 검정 바, 로고 + © 2026 WABI-SABI. All rights reserved.

---

## 2. 컬러 토큰

| 토큰 | 값 (추정) | 용도 |
|------|------|------|
| `--bg` | `#FFFFFF` | 기본 배경 |
| `--bg-subtle` | `#F7F6F4` | 섹션 배경(웜 오프화이트) |
| `--bg-muted` | `#EFEDEA` | 패널/이미지 플레이스홀더(웜그레이) |
| `--fg` | `#1A1A1A` | 본문 텍스트(니어블랙) |
| `--fg-muted` | `#6B6B6B` | 보조 텍스트 |
| `--border` | `#E5E3DF` | 경계선/인풋 테두리 |
| `--accent` | `#3B3733` | 버튼(구독하기 등) 웜 차콜 |
| `--footer` | `#0A0A0A` | 푸터 검정 |

> 제품 사진의 테라코타/오렌지 색감은 촬영물 액센트일 뿐 UI 토큰 아님.

### 상태 색상 (2026-07-17 추가)

브랜드 톤 유지를 위해 **배경을 채우지 않고 테두리 + 글자색만** 쓴다. 작은 텍스트(배지·뱃지)는 흰 배경 대비 4.5:1(WCAG AA)을 넘겨야 하므로 **700 계열** 사용 — `amber-600`(≈3.2:1)은 미달이라 금지.

| 용도 | 클래스 | 쓰는 곳 |
|------|--------|---------|
| 주의·대기 | `border-amber-300 text-amber-700` | 결제 대기, 재고 부족 |
| 진행 강조 | `border-wabi-fg text-wabi-fg` | 결제 완료 |
| 배송 중 | `border-blue-300 text-blue-700` | 주문 상태 |
| 완료·비활성 | `border-wabi-border text-wabi-fg-muted` | 배송 완료 |
| 위험·취소 | `border-red-300 text-red-700` | 주문 취소, 품절, 신고 |

---

## 3. 타이포그래피

- **한글 본문/제목:** Pretendard 권장 (웹폰트)
- **영문:** Inter 또는 시스템 산세리프
- **わび-さび 일본어 액센트:** Noto Serif JP 등 명조 계열로 브랜드 무드 강조
- 제목 굵게(Bold), 본문 보통, 보조텍스트 muted 컬러. 자간 약간 넓게(미니멀 톤).

---

## 4. 레이아웃

- 중앙 정렬 컨테이너 max-width ≈ 1200px
- 섹션 상하 패딩 넉넉히 (예: 96–128px)
- 상품 그리드: Shop 4열 / Featured 4열 / 초안 홈 컬렉션 3열 — 반응형으로 모바일 1–2열
- 이미지 비율 1:1 위주 (제품 카드)

---

## 5. 모션·스크롤 인터랙션 (2026-07-17 신설)

애플식 방향의 구현 규칙. **외부 애니메이션 라이브러리를 쓰지 않는다** — CSP·번들 부담 없이 IntersectionObserver + 클래스 토글, rAF + transform 으로 충분하다.

### 원칙
1. **`prefers-reduced-motion` 은 항상 존중** — 모션 민감 사용자에겐 애니메이션 없이 즉시 표시. CSS `motion-reduce:*` override 또는 리스너 미등록.
2. **LCP 를 해치지 않는다** — 히어로 로고는 LCP 후보다. 초기 렌더에서 `opacity-0`/transform 을 걸면 LCP 가 나빠진다. **첫 화면 요소엔 진입 애니메이션을 걸지 않고**, 스크롤이 시작될 때만 손댄다. Shop 그리드도 첫 행은 즉시 표시.
   - 예외: 중간 로드(`scrollY > 0`, 새로고침·뒤로가기)에선 초기 1회 반영해야 어긋나지 않는다.
3. **스크롤 핸들러는 passive + rAF** — 프레임당 1회만 계산. 연속 진행도를 React state 로 두지 않는다(프레임마다 리렌더). 인덱스 같은 이산 값만 state.
4. **콘텐츠는 DOM 에 항상 존재** — 등장 전에도 마크업이 있어야 SEO·스크린리더에 문제없다(opacity 로만 숨김).

### 컴포넌트
| 컴포넌트 | 역할 |
|---|---|
| `Reveal` | 뷰 진입 시 1회 등장. variant `up`/`left`/`right`/`scale`/`blur`, `delay`(0~500ms stagger). 섹션·카드 공용 |
| `HeroParallax` | 히어로 배경 0.18배·콘텐츠 0.15배 속도로 이동, 콘텐츠는 뷰포트 진행도로 페이드아웃 |
| `HeroSlideshow` | 히어로 배경 상품 사진 크로스페이드(3초 간격, 2.5초 전환). 1장 이하 정적 |
| `ScrollShowcase` | sticky 로 화면 고정 + 스크롤 진행도 → 상품 인덱스 매핑(스크럽). 상품당 70vh |

> **`ScrollShowcase` 는 애플 360° 회전과 동일한 메커니즘**(스크롤 위치 → 프레임 매핑). 제품 턴테이블 촬영(10° 간격 36장, 배경·조명 고정)이 확보되면 `items` 를 프레임으로 교체해 회전 스크럽으로 확장한다.

### 등장 연출 배치 (홈)
Featured 카드 `scale` stagger · Philosophy 좌우(`left`/`right`) 모임 · Values stagger · Visit 좌우 · Newsletter `scale`

---

## 6. 컴포넌트 인벤토리

**레이아웃·브랜드**: Header(로고+nav: Shop/About/Contact) · Footer(사업자정보 — 값 있을 때만 렌더) · Container

**상품**: ProductCard(이미지/카테고리/이름/₩가격 + 품절 오버레이) · ProductGallery(썸네일 클릭 → 메인 전환) · ProductDetailActions(수량·장바구니·바로구매) · AddToCartButton(품절 시 비활성) · WishlistButton · RestockButton(품절 시 재입고 알림)

**홈**: HeroParallax · HeroSlideshow · ScrollShowcase · Reveal · FeaturedGrid · PhilosophySplit · ValuesRow(3) · VisitUs(정보+MapCard) · NewsletterForm

**주문·마이페이지**: OrderStatusBadge(상태 색 구분) · CancelOrderButton · 로딩 스켈레톤(`loading.tsx` — shop·mypage·orders·wishlist·review·notice·inquiry)

**게시판**: ReviewSection(별점·구매자만 작성) · ReportReviewButton(신고 사유 select) · Stars

**어드민**: 대시보드 요약 카드(처리 대기·오늘 현황) · ProductCreateForm · ProductImageAdder · 콘텐츠 편집(textarea)

---

## 7. 실제 콘텐츠

> ⚠️ 아래는 **시안 추출 시점(2026-06-18)의 초안**이다. 현재 운영값의 단일 출처는 코드다:
> - 브랜드·매장 정보 → `web/src/lib/site.ts` (`site`, `business`)
> - **소개 문구(わび-さび / Philosophy) → DB `site_content`** — 대표님이 어드민 `/admin/content` 에서 직접 편집(2026-07-16, #160). 코드의 `DEFAULT_PHILOSOPHY` 는 미저장 시 폴백일 뿐.

### わび-さび (Wabi-sabi) 소개 카피 — 기본값
> わび-さび (Wabi-sabi)는 불완전함과 무상함의 아름다움을 받아들이는 일본의 미학입니다.
> 우리는 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를 큐레이션합니다. 각 제품은 장인의 손길이 닿은 유일무이한 작품입니다.
> 10년 넘게 오가바의 도자기로 만든 라면을 먹어온 우리가, 생각한 도자기를 만들어주었으면 하고 오가바 작가님께 주문을 했습니다. 주문하신 분들만이 가지실 수 있는 특별한 작품들입니다.

### Our Values
- **Imperfection** — 불완전함 속에서 발견하는 독특한 아름다움
- **Simplicity** — 단순함이 만들어내는 깊이있는 여백
- **Authenticity** — 장인의 손길이 담긴 진정성있는 작품

### Visit Us — ⚠️ 아래 위치는 **폐기된 초안**(시안의 서울 주소). 확정값은 §8 표 참조
- **영업시간:** 12:00 – 19:00, **수요일 휴무**
- **위치:** ~~Artist House — 서울 종로구 필운대로1길 22~~ → **충남 천안시 동남구 대흥로 338 1층 2호 (31122)** (2026-07-05 대표님 확정)
  - 지도 검색용 도로명(`site.roadAddress`)과 네이버 플레이스 ID(`2012676632`)를 따로 둔다 — 상호·층/호·우편번호가 섞인 문자열은 네이버·카카오에서 검색이 실패한다(#119).
- **전화:** 0507-1430-3085 · **인스타그램:** @wasa.kr · **문의:** info@wasa.kr

### Newsletter
- 제목: Newsletter / "신상품과 특별한 소식을 가장 먼저 받아보세요" / 버튼 "구독하기"

### 컬렉션 샘플 상품명 (초안)
세라믹 볼(Handcrafted ceramic bowl) · 도자기 접시(Artisan pottery plate) · 찻잔 세트(Tea cup collection) · 화병(Minimalist vase) · 수저 세트(Wooden cutlery set) · 다기세트(Japanese teapot)

---

## 8. ✅ 확정값 (대표님 확인)

| 항목 | 확정값 | 확인일 |
|------|--------|--------|
| 휴무일 | **수요일 휴무** | 2026-07-05 |
| 영업시간 | **12:00 – 19:00** | 2026-07-05 |
| 주소 | **충남 천안시 동남구 대흥로 338 1층 2호 와비사비 (31122)** | 2026-07-05 |
| nav 명칭 | **Shop / About / Contact** | 2026-07-05 |
| 고객 응대 전화 | **0507-1430-3085** | 2026-07-15 |
| 사업자등록번호 | **411-74-00574** | 2026-07-16 |
| 통신판매업신고 | **2026-충남천안-1000** | 2026-07-16 |
| 도메인 | **wasa.kr** (구매 완료, 등록자=대표님) | 2026-07-16 |
| 소개 섹션 제목 | **わび-さび (Wabi-sabi)** (기존 "철학 Philosophy" 에서 변경) | 2026-07-16 |

> 값의 단일 출처는 `web/src/lib/site.ts`. 사업자정보는 **빈 값이면 렌더에서 생략**된다 — 허위 표시 방지(전자상거래법 §10).

---

## 9. 미확정 (대기)

- 개인정보보호책임자 (👤 대표님) — 미기재 시 대표자 폴백
- 반품 배송비 금액·회수 방법 (👤 대표님)
- **실상품 사진** (👤) — 현재 일부가 테스트 이미지. About 브랜드 이미지 자리도 로고 마크 플레이스홀더 상태(실매장/작품 사진 대기)
- 360° 제품 촬영 (👤) — 확보 시 `ScrollShowcase` 회전 스크럽으로 확장
