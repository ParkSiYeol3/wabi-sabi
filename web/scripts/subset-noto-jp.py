#!/usr/bin/env python3
"""Noto Serif JP 를 우리가 쓰는 글자만 담아 받는다(#699 후속).

일본어·한자는 브랜드 표기에만 쓴다 — わび-さび, 侘寂選, 序破急 정도로 열몇 자다.
그런데 next/font/google 이 싣던 Noto Serif JP 는 홈에서만 190KB 가까이 받아 갔다.
한자 폰트는 글자 수가 많아 구간 하나가 통째로 크기 때문이다.

Google Fonts 의 text= 파라미터로 "이 글자들만" 담은 woff2 를 받아 self-host 한다.
가나는 전부 담는다 — 대표님이 일본어 문구를 더 쓸 수 있어 그 정도 여유는 둔다.
한자는 지금 쓰는 것만 담으므로, 새 한자를 넣으면 그 글자만 다른 글꼴로 보인다.
그때는 이 스크립트를 다시 돌리면 된다.

사용: python3 scripts/subset-noto-jp.py
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "src" / "fonts"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)
WEIGHTS = ["400", "600"]

# 담을 글자는 소스에 실제로 있는 것만 — 가나 전체를 넣으면 두 굵기 합이 131KB 로
# 불어난다(실측). 쓰는 글자만 담으면 12KB 다. 일본어 문구를 새로 넣으면 그 글자만
# 다른 글꼴로 보이므로, 그때 이 스크립트를 다시 돌린다.


def used_japanese() -> tuple:
    """소스에 실제로 쓰인 가나·한자. 한글은 마루부리가 맡으므로 제외한다."""
    kana, kanji = set(), set()
    for p in list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx")):
        for ch in p.read_text(encoding="utf-8", errors="ignore"):
            if "ぁ" <= ch <= "ヿ":
                kana.add(ch)
            elif "一" <= ch <= "鿿":
                kanji.add(ch)
    return "".join(sorted(kana)), "".join(sorted(kanji))


def fetch(url: str, out: Path | None = None) -> str:
    cmd = ["curl", "-s", "--max-time", "30", "-A", UA, url]
    if out:
        cmd += ["-o", str(out)]
    res = subprocess.run(cmd, capture_output=True, text=not out, check=False)
    return res.stdout if not out else ""


def main() -> None:
    kana, kanji = used_japanese()
    text = kana + kanji
    print(f"담을 글자: 가나 {kana} + 한자 {kanji} (모두 {len(text)}자)")

    total = 0
    faces = []
    for w in WEIGHTS:
        url = (
            "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@"
            + w
            + "&text="
            + subprocess.run(
                ["python3", "-c", "import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))", text],
                capture_output=True, text=True, check=True,
            ).stdout.strip()
            + "&display=swap"
        )
        css = fetch(url)
        m = re.search(r"src:\s*url\((https://[^)]+)\)", css)
        if not m:
            print("woff2 주소를 못 찾음(weight %s)" % w, file=sys.stderr)
            print(css[:300], file=sys.stderr)
            sys.exit(1)
        out = FONT_DIR / f"NotoSerifJP-{w}.subset.woff2"
        fetch(m.group(1), out)
        size = out.stat().st_size
        total += size
        print(f"  weight {w}: {size // 1024}KB → {out.name}")
        faces.append((w, out.name))

    print(f"합계 {total // 1024}KB")
    snippet = "\n".join(
        f'''@font-face {{
  font-family: "NotoSerifJPSubset";
  src: url("../fonts/{name}") format("woff2");
  font-weight: {w};
  font-style: normal;
  font-display: swap;
}}'''
        for w, name in faces
    )
    (FONT_DIR / "noto-jp-faces.css").write_text(snippet + "\n")
    print("@font-face 조각 → src/fonts/noto-jp-faces.css (app/fonts.css 에 붙여 넣는다)")


if __name__ == "__main__":
    main()
