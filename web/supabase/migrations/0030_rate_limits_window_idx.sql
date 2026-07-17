-- 0030: rate_limits 정리 쿼리용 인덱스 (#187 CodeRabbit)
--
-- 0029 의 청소 로직은 `delete ... where window_start < X` 로 window_start 단일 컬럼만
-- 쓴다. 기본 키가 (bucket, window_start) 순서라 선두 컬럼(bucket) 조건이 없는 이 삭제는
-- PK 를 못 타고 테이블을 전수 스캔한다. 부하 시 (활성 버킷 × 최근 창) 만큼 행이 쌓이므로
-- window_start 단일 인덱스로 범위 삭제를 인덱스 스캔으로 만든다.

create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);
