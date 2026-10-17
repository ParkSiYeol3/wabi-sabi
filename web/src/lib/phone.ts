// 전화번호 표시용 하이픈(시열님 #840) — 저장값은 손님이 입력한 그대로(숫자만 또는
// 하이픈 섞임)라 화면에서만 010-1234-5678 꼴로 맞춘다. 검색·중복 판정(checkout)은
// 저장값 그대로 쓰므로 여기서 바꾸지 않는다. 모르는 형식은 원문을 그대로 돌려준다.
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const join = (...parts: string[]) => parts.join("-");

  // 휴대폰 — 010-1234-5678 / 011-123-4567
  if (/^01[016789]\d{7,8}$/.test(d))
    return d.length === 11
      ? join(d.slice(0, 3), d.slice(3, 7), d.slice(7))
      : join(d.slice(0, 3), d.slice(3, 6), d.slice(6));
  // 서울 — 02-123-4567 / 02-1234-5678
  if (/^02\d{7,8}$/.test(d))
    return d.length === 10
      ? join("02", d.slice(2, 6), d.slice(6))
      : join("02", d.slice(2, 5), d.slice(5));
  // 안심번호 — 050x 는 4자리 국번. 0507-1234-5678(12자리) / 0504-085-9928(11자리)
  if (/^050\d{8,9}$/.test(d))
    return d.length === 12
      ? join(d.slice(0, 4), d.slice(4, 8), d.slice(8))
      : join(d.slice(0, 4), d.slice(4, 7), d.slice(7));
  // 지역번호·070 — 041-123-4567 / 070-1234-5678
  if (/^0\d{2}\d{7,8}$/.test(d))
    return d.length === 11
      ? join(d.slice(0, 3), d.slice(3, 7), d.slice(7))
      : join(d.slice(0, 3), d.slice(3, 6), d.slice(6));
  // 대표번호 — 1588-1234
  if (/^1\d{7}$/.test(d)) return join(d.slice(0, 4), d.slice(4));
  return raw;
}
