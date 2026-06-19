# WABI-SABI 온라인 스토어 — 프로젝트 브리핑 (Claude Code 핸드오프용)

> 이 문서는 지금까지 기획한 내용을 Claude Code CLI에게 전달하기 위한 핸드오프 브리핑입니다.
> 일부 항목(WSB-013~026 상세 등)은 이전 대화에서 분류·제목만 확정된 상태라, 구현 전 세부 확정이 필요합니다. 해당 부분은 `⚠️ 확정 필요`로 표시했습니다.

---

## 1. 프로젝트 개요

- **프로젝트명:** WABI-SABI 온라인 스토어 (wasa.kr)
- **분류:** 불완전함의 미적 아름다움 → 와비사비 리빙·소품·식기 온라인 쇼핑몰
- **브랜드:** WABI-SABI [와비-사비]
- **카테고리:** Tableware(식기) · Objects(오브제) · Craft(공예) · Gifts(선물)
- **오프라인 매장:** Open 12–7 / 일요일 휴무, Instagram @wasa.kr
- **개발 체계:** 1인 풀스택 개발 (Solo Full-Stack)
- **디자인 무드:** 흑백 미니멀, 웜그레이(warm gray) 톤. 브랜드 무드를 해치지 않는 절제된 UI/UX

### 프로젝트 목표
와비사비 브랜드의 미적 정체성을 온라인에서도 동일하게 구현하고, 상품 탐색부터 구매·선물 포장까지 완결된 쇼핑 경험을 제공하는 풀스택 이커머스 플랫폼 구축.

### 문제 인식
- 오프라인 매장 중심 운영(일요일 휴무, 12–7시) → 시공간 외 구매 불가, 접근성 한계
- Instagram 채널만으로는 상품 정보 전달·구매 전환 한계
- 선물 수요가 높은 브랜드 특성상 온라인 탐색→구매 완결 경험 필요
- 브랜드 세계관(와비-사비 미학)을 일관되게 전달할 온라인 공간 부재

---

## 2. 기술 스택

| 영역 | 스택 |
|------|------|
| 프론트엔드 | Next.js (SSR/SSG 활용, SEO 강화) |
| 백엔드/DB | Supabase (Auth + PostgreSQL) |
| 상태 관리 | Zustand |
| 배포 | Vercel |
| 디자인 | Figma |
| 버전 관리 | GitHub |

---

## 3. 사이트맵 (IA)

```
홈 (Home)
├── 상품 (Shop)        → 카테고리/검색/필터/상세
├── 브랜드 (Brand)     → 브랜드 스토리/매장 안내/인스타 피드
├── 인증 (/auth)        → 로그인/회원가입 (탭 전환 단일 카드 UI)
├── 장바구니 (Cart)     → 비회원도 이용 가능
├── 마이페이지          → 내 정보/주문 내역/위시리스트
└── 어드민 (Admin)      → 상품/재고/주문 관리
```

---

## 4. 기능 요구사항 (WSB-001 ~ WSB-026)

### 회원 (WSB-001~006)
| ID | 기능 | 상세 | 우선순위 |
|----|------|------|:---:|
| WSB-001 | 일반 회원가입 | 이메일/비밀번호/비밀번호 확인/이름 입력 + 이메일 인증 | 상 |
| WSB-002 | 소셜 로그인 | 카카오/구글 OAuth 간편 로그인 | 중 |
| WSB-003 | 로그인 | 이메일+비밀번호 | 상 |
| WSB-004 | 내 정보 확인&수정 | 이메일/이름/배송지 목록 관리 | 상 |
| WSB-005 | 주문 내역 조회 | 주문번호/주문일시/상품명·수량/결제금액/배송상태(결제완료·배송중·배송완료) | 상 |
| WSB-006 | 위시리스트 조회&해제 | 좋아요 누른 상품 목록 조회 및 해제 | 중 |

### 상품 (WSB-007~012)
| ID | 기능 | 상세 | 우선순위 |
|----|------|------|:---:|
| WSB-007 | 카테고리별 상품 조회 | Tableware/Objects/Craft/Gifts, 기본 정렬 신상품순 | 상 |
| WSB-008 | 상품 키워드 검색 | 상품명 기반 검색 | 상 |
| WSB-009 | 상품 필터링&정렬 | 정렬: 신상품순(기본)/인기순/낮은가격순/높은가격순 · 필터: 카테고리/가격범위 | 중 |
| WSB-010 | 상품 상세 페이지 | 멀티이미지/상품명/가격/설명/(소재·사이즈·주의사항 탭)/재고 여부(확정 필요) | 상 |
| WSB-011 | 상품 위시리스트 추가/삭제 | 상세에서 좋아요로 위시리스트 추가·해제 | 중 |
| WSB-012 | 관련 상품 추천 | 상세 하단에 같은 카테고리 연관 상품 노출 | 하 |

### 주문 (WSB-013~019)
| ID | 기능 | 상세 | 우선순위 |
|----|------|------|:---:|
| WSB-013 | 장바구니 담기/수량변경/삭제 | 비회원도 장바구니 이용 가능 | 상 |
| WSB-014~019 | 주문서 / 결제 / 선물 포장 / 메시지 카드 | ⚠️ 분류·제목만 확정. 각 항목 상세(결제 PG 연동 방식, 선물 포장 옵션·가격, 메시지 카드 입력 폼 등) 구현 전 확정 필요 | ⚠️ |

### 브랜드 (WSB-020~022)
- 브랜드 스토리, 매장 안내, 인스타그램 피드 노출 → ⚠️ 세부 화면 구성 확정 필요

### 어드민 (WSB-023~026)
- 상품 CRUD, 재고 관리, 주문 관리, 송장(tracking number) 번호 입력 → ⚠️ 권한/화면 상세 확정 필요

### 비기능 요구사항
- 성능 / 보안 / SEO (Next.js SSR·SSG로 상품 페이지 SEO 강화)

---

## 5. DB 스키마 (ERD)

총 7개 테이블 구성. 핵심 엔티티는 아래와 같습니다.

### 주문·결제·선물 영역 (확정된 정의)

```
USERS {
  uuid id PK
  string email
  string name
}

PRODUCTS {
  uuid id PK
  string name
  int price
  int stock
}

ORDERS {
  uuid id PK
  uuid user_id FK
  string order_number
  string status
  int total_price
  string recipient
  string phone
  string address
  string delivery_memo
  string tracking_number
  timestamp ordered_at
}

ORDER_ITEMS {
  uuid id PK
  uuid order_id FK
  uuid product_id FK
  string product_name
  int price
  int quantity
}

GIFT_OPTIONS {
  uuid id PK
  uuid order_id FK
  string package_type
  int extra_price
  string sender_name
  string message
}
```

**관계**
- `USERS ||--o{ ORDERS` — 한 사용자가 여러 주문
- `ORDERS ||--|{ ORDER_ITEMS` — 한 주문에 여러 주문 항목
- `ORDER_ITEMS }o--|| PRODUCTS` — 주문 항목은 상품을 참조
- `ORDERS ||--o| GIFT_OPTIONS` — 주문당 선물 옵션 0~1개

### 사용자·상품·카테고리 영역
⚠️ `categories`, `wishlist`, `addresses` 테이블이 이 영역에 포함됩니다. 컬럼 상세 정의는 이전 대화에서 대략까지만 작성되어, 구현 전 한 번 확정이 필요합니다.

---

## 6. 인증 구현 메모 (Supabase)

- `supabase.auth.signInWithPassword()` — 이메일 로그인
- `supabase.auth.signInWithOAuth()` — 카카오/구글
- `supabase.auth.signUp()` — 회원가입 + 이메일 인증 자동 발송
- `supabase.auth.onAuthStateChange()` — 인증 상태 전역 관리 (Zustand 연동)
- **UX:** 비회원도 장바구니까지 이용 가능 → 결제 시작 시 로그인 유도(게스트→로그인)로 이탈률 완화

---

## 7. 개발 일정 (14주)

| 단계 | 주요 작업 | 산출물 | 기간 |
|------|----------|--------|------|
| 기획 | 요구사항 정의, IA 설계, 와이어프레임 | 요구사항 명세, IA 문서 | 1~2주차 |
| 디자인 | Figma UI 디자인, 디자인 시스템 | Figma 파일 | 3~4주차 |
| 개발—기반 | 프로젝트 셋업, DB 스키마, 인증 | GitHub Repo, Supabase Schema | 5~6주차 |
| 개발—핵심 | 상품/장바구니/주문/결제 | 핵심 기능 완료 | 7~10주차 |
| 개발—부가 | 어드민, 선물 기능, SEO 최적화 | 전체 기능 완료 | 11~12주차 |
| 테스트&배포 | QA, 버그 수정, Vercel 배포 | 프로덕션 배포 | 13~14주차 |

---

## 8. Claude Code에 우선 요청하기 좋은 작업

1. Next.js + Supabase 프로젝트 초기 셋업 (디렉터리 구조, 환경변수, Supabase 클라이언트)
2. ERD 기반 Supabase 마이그레이션 SQL 작성 (위 7개 테이블)
3. 인증 플로우 구현 (`/auth` 로그인·회원가입, Zustand 전역 상태)
4. 상품 목록/상세/필터 (WSB-007~012)
5. 장바구니 (비회원 포함) + 주문/결제 플로우 (WSB-013~)

> 작업 시작 전, ⚠️ 확정 필요 항목(WSB-014~026 상세, categories/wishlist/addresses 컬럼)을 먼저 확정하면 충돌 없이 진행됩니다.
