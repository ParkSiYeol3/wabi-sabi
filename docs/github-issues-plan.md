# GitHub 이슈 등록 계획 (gh 로그인 후 일괄 생성)

라벨: `feature` `auth` `shop` `order` `brand` `admin` `priority:high|mid|low`

| # | 제목 | 라벨 | 우선 |
|---|------|------|------|
| 1 | [WSB-001/003] 회원가입·로그인 (Supabase Auth) | feature, auth | high |
| 2 | [WSB-002] 소셜 로그인 (카카오/구글 OAuth) | feature, auth | mid |
| 3 | [WSB-004] 내 정보 확인·수정 + 배송지 | feature, auth | high |
| 4 | [WSB-005] 주문 내역 조회 | feature, order | high |
| 5 | [WSB-006/011] 위시리스트 | feature, shop | mid |
| 6 | [WSB-007] 카테고리별 상품 조회 (Supabase 연동) | feature, shop | high |
| 7 | [WSB-008] 상품 키워드 검색 | feature, shop | high |
| 8 | [WSB-009] 필터·정렬 (가격/인기/신상) | feature, shop | mid |
| 9 | [WSB-010] 상품 상세 페이지 | feature, shop | high |
| 10 | [WSB-012] 관련 상품 추천 | feature, shop | low |
| 11 | [WSB-013] 장바구니 (비회원 포함, Zustand) | feature, order | high |
| 12 | [WSB-014~019] 주문서·결제·선물포장·메시지카드 | feature, order | high |
| 13 | [WSB-020~022] 브랜드(스토리·매장·인스타피드) | feature, brand | mid |
| 14 | [WSB-023~026] 어드민(상품CRUD·재고·주문·송장) | feature, admin | mid |
| 15 | 인프라: Supabase 프로젝트 생성·마이그레이션 적용 | feature | high |
| 16 | 비기능: SEO·성능·보안·접근성 점검 (지속) | feature | mid |

## 미확정 (이슈에 메모로 박을 것)
- 결제 PG: 토스페이먼츠 vs 포트원(아임포트)
- 휴무일: 수요일(시안) 채택 — 브리핑 일요일과 충돌 해소 확인
- categories/wishlist/addresses 컬럼 최종 확정

## 등록 명령 예 (gh)
```bash
gh issue create --title "[WSB-007] 카테고리별 상품 조회" \
  --label feature,shop --body-file -  # 본문 stdin
```
