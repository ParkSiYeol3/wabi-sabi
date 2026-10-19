// 한글 자판 상태로 친 글자를 두벌식 자판의 영문 글자로 되돌린다(예: "ㅈ뮤ㅑ" → "wabi").
// 비밀번호를 맞게 쳤는데 한/영 상태 때문에 틀렸다고 나오는 일을 막는 데 쓴다.
// Shift 로 나오는 쌍자음·ㅒ·ㅖ 는 대문자(Q W E R T O P)로 돌아가지만, 그 밖의
// 대문자는 한글 자판에서 소문자와 같은 글자가 나와 되돌릴 수 없다.

// 초성 19자 (가 = U+AC00 기준 순서)
const CHO = "r R s e E f a q Q t T d w W c z x v g".split(" ");
// 중성 21자
const JUNG =
  "k o i O j p u P h hk ho hl y n nj np nl b m ml l".split(" ");
// 종성 27자 (0번 = 받침 없음)
const JONG = [
  "",
  ..."r R rt s sw sg e f fr fa fq ft fx fv fg a q qt t T d w c z x v g".split(" "),
];
// 호환 자모 자음 30자 (ㄱ U+3131 ~ ㅎ U+314E)
const COMPAT_CONSONANT =
  "r R rt s sw sg e E f fr fa fq ft fx fv fg a q Q qt t T d w W c z x v g".split(" ");

const HANGUL = /[ᄀ-하-ᅵᆨ-ᇂㄱ-ㅣ가-힣]/;

export function hasHangul(s: string): boolean {
  return HANGUL.test(s);
}

function keysOf(ch: string): string {
  const c = ch.charCodeAt(0);
  // 완성형 음절
  if (c >= 0xac00 && c <= 0xd7a3) {
    const i = c - 0xac00;
    return CHO[Math.floor(i / 588)] + JUNG[Math.floor((i % 588) / 28)] + JONG[i % 28];
  }
  // 호환 자모 (ㄱ~ㅎ, ㅏ~ㅣ): 모바일 자판이 낱자로 보낼 때
  if (c >= 0x3131 && c <= 0x314e) return COMPAT_CONSONANT[c - 0x3131];
  if (c >= 0x314f && c <= 0x3163) return JUNG[c - 0x314f];
  // 첫가끝 자모 (조합 전 낱자, NFD)
  if (c >= 0x1100 && c <= 0x1112) return CHO[c - 0x1100];
  if (c >= 0x1161 && c <= 0x1175) return JUNG[c - 0x1161];
  if (c >= 0x11a8 && c <= 0x11c2) return JONG[c - 0x11a7];
  return ch;
}

export function hangulToQwerty(s: string): string {
  if (!hasHangul(s)) return s;
  let out = "";
  for (const ch of s) out += keysOf(ch);
  return out;
}
