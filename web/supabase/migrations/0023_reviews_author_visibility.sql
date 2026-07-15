-- 0023: 숨김 리뷰라도 작성자 본인에겐 보이게 (#141, #142 리뷰 반영)
--
-- 0022 의 공개 read 정책은 hidden=false 만 허용했다. 그 결과 어드민이 리뷰를 숨기면
-- 작성자 본인도 자기 리뷰를 볼 수 없었고, 상세 페이지의 alreadyReviewed 검사(숨김을
-- 걸러낸 목록 기준)가 false 가 되어, 재작성 시 unique(product_id,user_id) 위반으로
-- insert 가 조용히 실패했다 — 사용자에겐 리뷰가 사라진 것처럼 보였다.
--
-- 작성자 본인 예외를 추가한다. 공개(익명·타인) 노출은 여전히 hidden=false 만.
-- 통계·전체 목록은 애플리케이션에서 hidden=false 를 명시해 본인 숨김 리뷰가 평균이나
-- /review 목록에 새지 않게 한다. 상세 페이지에선 본인 숨김 리뷰에 "숨김 처리됨" 표시.

drop policy if exists "reviews public read visible" on public.reviews;

create policy "reviews read visible or own"
  on public.reviews for select
  using (hidden = false or auth.uid() = user_id);
