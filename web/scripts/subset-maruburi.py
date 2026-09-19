#!/usr/bin/env python3
"""마루부리 Light 를 두 조각으로 나눈다(#699).

한글 완성형 11,172자가 든 원본은 425KB 다. font-display: swap 이라 글자는 폴백으로
먼저 보이지만, 느린 망에서는 그 큰 파일이 다 와야 최종 모습이 된다.

조각은 겹치지 않고, 합치면 원본과 같다 — 어느 글자도 빠지지 않는다.
  1단: 지금 사이트가 실제로 쓰는 글자(+라틴·기호). 거의 모든 방문자가 이것만 받는다.
  2단: 나머지 전부. 드문 글자가 있는 페이지에서만 받는다.

1단 목록은 프로덕션 페이지와 소스의 글자에서 뽑는다. 상품이 늘어 새 글자가 생기면
그 방문자가 2단을 한 번 받을 뿐 깨지지 않는다. 가끔 다시 돌려 1단을 넓히면 된다.

사용: python3 scripts/subset-maruburi.py   (fontTools 필요)
"""

import re
import subprocess
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "fonts" / "MaruBuri-Light.woff2"
OUT1 = ROOT / "src" / "fonts" / "MaruBuri-Light.tier1.woff2"
OUT2 = ROOT / "src" / "fonts" / "MaruBuri-Light.tier2.woff2"
PAGES = [
    "", "/shop", "/today", "/notice", "/about", "/review", "/inquiry",
    "/legal/terms", "/legal/privacy", "/legal/refund", "/order-lookup",
]


def site_codepoints() -> set:
    chunks = []
    for path in PAGES:
        res = subprocess.run(
            ["curl", "-s", "--max-time", "20", f"https://wasa.kr{path}"],
            capture_output=True, text=True, check=False,
        )
        if res.stdout:
            chunks.append(res.stdout)
        else:
            print("페이지 수집 실패:", path or "/", file=sys.stderr)
    for p in list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx")):
        chunks.append(p.read_text(encoding="utf-8", errors="ignore"))
    joined = re.sub(r"<[^>]+>", " ", "\n".join(chunks))
    return {ord(c) for c in joined if 0x20 < ord(c) < 0xFFFF}


def cut(cps: set, out: Path) -> int:
    subset.main([
        str(SRC),
        "--unicodes=" + ",".join(f"U+{c:04X}" for c in sorted(cps)),
        "--flavor=woff2",
        f"--output-file={out}",
        "--layout-features=*",
        "--no-hinting",
    ])
    return out.stat().st_size


def ranges(cps: set) -> str:
    """연속한 코드포인트를 U+A-B 로 묶어 CSS unicode-range 문자열을 만든다."""
    groups, run = [], []
    for c in sorted(cps):
        if run and c == run[-1] + 1:
            run.append(c)
            continue
        if run:
            groups.append(run)
        run = [c]
    if run:
        groups.append(run)
    return ", ".join(
        f"U+{g[0]:04X}" if len(g) == 1 else f"U+{g[0]:04X}-{g[-1]:04X}" for g in groups
    )


def main() -> None:
    font = TTFont(SRC)
    all_cps = set()
    for table in font["cmap"].tables:
        all_cps |= set(table.cmap.keys())

    # 라틴·기호(U+2000 미만)는 어느 페이지에나 나오므로 무조건 1단에 둔다.
    tier1 = (site_codepoints() & all_cps) | {c for c in all_cps if c < 0x2000}
    tier2 = all_cps - tier1
    size1, size2 = cut(tier1, OUT1), cut(tier2, OUT2)

    print(f"원본 {SRC.stat().st_size // 1024}KB ({len(all_cps)}자)")
    print(f"1단  {size1 // 1024}KB ({len(tier1)}자) → {OUT1.name}")
    print(f"2단  {size2 // 1024}KB ({len(tier2)}자) → {OUT2.name}")
    for name, cps in (("tier1", tier1), ("tier2", tier2)):
        path = ROOT / "src" / "fonts" / f"{name}-range.txt"
        path.write_text(ranges(cps))
        print(f"{name} unicode-range → src/fonts/{path.name}")


if __name__ == "__main__":
    main()
