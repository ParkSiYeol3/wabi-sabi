// 이미지 파일 앞부분(헤더)에서 원본 크기를 읽는 순수 파서 — JPEG·PNG·WebP.
// 네트워크·캐시는 image-size.ts 가 맡는다(이 파일은 Buffer 만 받는다).

export type ImageSize = { width: number; height: number };

export function fromPng(b: Buffer): ImageSize | null {
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

export function fromJpeg(b: Buffer): ImageSize | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // 길이 필드가 없는 마커들(패딩·RST·SOI/EOI)은 그냥 넘긴다.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    // SOF0~SOF15 중 DHT(c4)·JPG(c8)·DAC(cc) 제외 — 크기는 마커 뒤 5·7 바이트.
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      if (i + 9 > b.length) return null;
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

export function fromWebp(b: Buffer): ImageSize | null {
  if (b.length < 30) return null;
  if (b.toString("ascii", 0, 4) !== "RIFF") return null;
  if (b.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X")
    return {
      width: b.readUIntLE(24, 3) + 1,
      height: b.readUIntLE(27, 3) + 1,
    };
  if (kind === "VP8 ") {
    const start = b.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
    if (start < 0 || start + 7 > b.length) return null;
    return {
      width: b.readUInt16LE(start + 3) & 0x3fff,
      height: b.readUInt16LE(start + 5) & 0x3fff,
    };
  }
  if (kind === "VP8L") {
    // 시그니처(0x2f) 다음 14비트 폭·14비트 높이, 각각 −1 로 저장된다.
    if (b[20] !== 0x2f || b.length < 25) return null;
    const bits = b.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  return null;
}
