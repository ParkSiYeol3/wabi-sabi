# WABI-SABI 디자인 시스템

> Figma 보드 `te2FQ9BTmVogmqnzUihEUH` ("와비사비 웹 사이트", FigJam)에서 추출.
> 보드는 이미지 기반 무드/레퍼런스 보드라 디자인 토큰이 구조화돼 있지 않음 → 시안 이미지에서 수동 도출함.
> 추출일: 2026-06-18.

---

## 1. 디자인 방향

흑백 미니멀 + 웜그레이(warm gray). 여백 넓음, 제품 사진이 주인공. 절제된 타이포. 와비-사비 미학(불완전·무상·단순)을 UI 절제로 표현.

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

## 5. 컴포넌트 인벤토리

Header(로고+nav: Shop/About/Contact 또는 About/Collection/Visit) · Hero · ProductCard(이미지/카테고리/이름/₩가격) · FilterBar · FeaturedGrid · PhilosophySplit · ValuesRow(3) · VisitUs(정보+지도) · Newsletter(이메일 인풋+구독 버튼) · Footer

---

## 6. 실제 콘텐츠 (시안에서 확보 — 그대로 사용 가능)

### Philosophy 카피
> わび-さび (Wabi-sabi)는 불완전함과 무상함의 아름다움을 받아들이는 일본의 미학입니다.
> 우리는 시간의 흔적이 담긴 수공예 도자기와 생활 오브제를 큐레이션합니다. 각 제품은 장인의 손길이 닿은 유일무이한 작품입니다.
> 10년 넘게 오가바의 도자기로 만든 라면을 먹어온 우리가, 생각한 도자기를 만들어주었으면 하고 오가바 작가님께 주문을 했습니다. 주문하신 분들만이 가지실 수 있는 특별한 작품들입니다.

### Our Values
- **Imperfection** — 불완전함 속에서 발견하는 독특한 아름다움
- **Simplicity** — 단순함이 만들어내는 깊이있는 여백
- **Authenticity** — 장인의 손길이 담긴 진정성있는 작품

### Visit Us
- **영업시간:** 오후 12:00 – 7:00, **수요일 휴무**
- **위치:** Artist House — 서울 종로구 필운대로1길 22 2층 와비사비 (wasa.kr 김은정의 대면거래 및 택배거래처)
- **인스타그램:** @wasa.kr
- **문의:** info@wasa.kr

### Newsletter
- 제목: Newsletter / "신상품과 특별한 소식을 가장 먼저 받아보세요" / 버튼 "구독하기"

### 컬렉션 샘플 상품명 (초안)
세라믹 볼(Handcrafted ceramic bowl) · 도자기 접시(Artisan pottery plate) · 찻잔 세트(Tea cup collection) · 화병(Minimalist vase) · 수저 세트(Wooden cutlery set) · 다기세트(Japanese teapot)

---

## 7. ✅ 브리핑 충돌 — 확정 완료 (2026-07-05, 대표님 확인)

| 항목 | 확정값 |
|------|--------|
| 휴무일 | **수요일 휴무** |
| 영업시간 | **12:00 – 19:00** |
| 주소 | **충남 천안시 동남구 대흥로 338 1층 2호 와비사비 (31122)** |
| nav 명칭 | **Shop / About / Contact** (대표님 피드백 픽스) |
