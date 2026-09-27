// User-Agent 를 짧은 이름 셋으로 줄인다(0070) — 방문 판별용. 원문은 저장하지 않는다.
// 국내 손님은 카카오톡·인스타·네이버 앱 안에서 링크를 여는 일이 많아 인앱을 먼저 본다.

export type UaInfo = { device: string; browser: string; os: string };

export function parseUserAgent(ua: string): UaInfo {
  const s = ua || "";
  const device = /iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))
    ? "tablet"
    : /Mobi|iPhone|iPod|Android/i.test(s)
      ? "mobile"
      : "desktop";

  const browser =
    /KAKAOTALK/i.test(s) ? "카카오톡" :
    /Instagram/i.test(s) ? "인스타그램" :
    /NAVER\(inapp|NAVER/.test(s) ? "네이버앱" :
    /FBAN|FBAV/i.test(s) ? "페이스북" :
    /Line\//i.test(s) ? "라인" :
    /Whale/i.test(s) ? "웨일" :
    /SamsungBrowser/i.test(s) ? "삼성인터넷" :
    /Edg\//i.test(s) ? "엣지" :
    /CriOS|Chrome\//i.test(s) ? "크롬" :
    /FxiOS|Firefox\//i.test(s) ? "파이어폭스" :
    /Safari\//i.test(s) ? "사파리" :
    "기타";

  const os =
    /iPhone|iPod/i.test(s) ? "iOS" :
    /iPad/i.test(s) ? "iPadOS" :
    /Android/i.test(s) ? "Android" :
    /Windows/i.test(s) ? "Windows" :
    /Mac OS X|Macintosh/i.test(s) ? "macOS" :
    /CrOS/i.test(s) ? "ChromeOS" :
    /Linux/i.test(s) ? "Linux" :
    "기타";

  return { device, browser, os };
}
