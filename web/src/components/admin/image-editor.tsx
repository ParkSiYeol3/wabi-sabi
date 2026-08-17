"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// 상품 이미지 간단 편집기 (대표님 — 인스타/카톡식) — 비율 크롭 + 90° 회전 +
// 밝기/대비/채도. 전부 브라우저 canvas 로 처리해 외부 라이브러리·요청 없음(CSP 안전).
// 결과는 편집된 JPEG File 로 돌려준다(onApply). 여러 장은 부모(picker)가 큐로 순회한다.

const RATIOS = [
  { key: "original", label: "원본", value: null as number | null },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "3:4", label: "3:4", value: 3 / 4 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
] as const;

const VMAX = 300; // 미리보기 뷰포트 긴 변(px)
const OUT_LONG = 1600; // 내보내기 긴 변(px)

type Offset = { x: number; y: number };

// 회전·비율·줌으로 뷰포트/커버스케일/오프셋 한계를 계산(순수).
function computeGeom(
  nw: number,
  nh: number,
  rotation: number,
  ratio: number | null,
  zoom: number,
) {
  const rotated = rotation % 180 !== 0;
  const rw = rotated ? nh : nw; // 회전 반영한 이미지 폭
  const rh = rotated ? nw : nh;
  const aspect = ratio ?? rw / rh; // 원본이면 이미지 비율 그대로
  let Fw: number, Fh: number;
  if (aspect >= 1) {
    Fw = VMAX;
    Fh = VMAX / aspect;
  } else {
    Fh = VMAX;
    Fw = VMAX * aspect;
  }
  const cover = Math.max(Fw / rw, Fh / rh); // 뷰포트를 꽉 채우는 최소 배율
  const scale = cover * zoom;
  const maxOx = Math.max(0, (rw * scale - Fw) / 2);
  const maxOy = Math.max(0, (rh * scale - Fh) / 2);
  return { Fw, Fh, scale, maxOx, maxOy };
}

const clampOffset = (o: Offset, maxOx: number, maxOy: number): Offset => ({
  x: Math.max(-maxOx, Math.min(maxOx, o.x)),
  y: Math.max(-maxOy, Math.min(maxOy, o.y)),
});

export function ImageEditor({
  file,
  index,
  total,
  onApply,
  onCancel,
}: {
  file: File;
  index: number; // 0-based
  total: number;
  onApply: (edited: File) => void;
  onCancel: () => void;
}) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturate, setSaturate] = useState(1);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  // File → ImageBitmap (EXIF 방향 반영). 편집 상태 초기화는 부모가 파일마다 key 로
  // remount 해 처리하므로(초기 useState 기본값), 여기선 비트맵 로드만 한다.
  useEffect(() => {
    let cancelled = false;
    let created: ImageBitmap | null = null;
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then((bmp) => {
        if (cancelled) {
          bmp.close();
          return;
        }
        created = bmp;
        setBitmap(bmp);
      })
      .catch(() => {
        // 디코드 실패(희귀) — 원본을 그대로 넘겨 업로드는 막지 않는다.
        if (!cancelled) onApply(file);
      });
    return () => {
      cancelled = true;
      created?.close();
    };
    // onApply 는 부모가 매 렌더 새로 만들 수 있어 의존성에서 제외(파일 기준으로만 재실행).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const nw = bitmap?.width ?? 0;
  const nh = bitmap?.height ?? 0;
  const geom = useMemo(
    () =>
      bitmap
        ? computeGeom(nw, nh, rotation, ratio, zoom)
        : { Fw: VMAX, Fh: VMAX, scale: 1, maxOx: 0, maxOy: 0 },
    [bitmap, nw, nh, rotation, ratio, zoom],
  );

  // 캔버스에 현재 상태를 그린다(미리보기·내보내기 공용). k=출력배율.
  const paint = useCallback(
    (canvas: HTMLCanvasElement, k: number) => {
      if (!bitmap) return;
      const outW = Math.round(geom.Fw * k);
      const outH = Math.round(geom.Fh * k);
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#f3ebdd";
      ctx.fillRect(0, 0, outW, outH);
      const off = clampOffset(offset, geom.maxOx, geom.maxOy);
      ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
      ctx.translate(outW / 2 + off.x * k, outH / 2 + off.y * k);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(geom.scale * k, geom.scale * k);
      ctx.drawImage(bitmap, -nw / 2, -nh / 2, nw, nh);
    },
    [bitmap, geom, offset, brightness, contrast, saturate, rotation, nw, nh],
  );

  // 미리보기 렌더 — 상태 변화마다. 레티나 선명도 위해 dpr 배율로 그리고 CSS 로 축소.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    paint(canvas, dpr);
    canvas.style.width = `${geom.Fw}px`;
    canvas.style.height = `${geom.Fh}px`;
  }, [paint, bitmap, geom.Fw, geom.Fh]);

  // 비율·줌·회전 변경 시 오프셋을 새 한계로 다시 clamp.
  const reclamp = (r: number | null, rot: number, z: number) => {
    const g = computeGeom(nw, nh, rot, r, z);
    setOffset((o) => clampOffset(o, g.maxOx, g.maxOy));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!bitmap) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.ox + (e.clientX - d.x);
    const ny = d.oy + (e.clientY - d.y);
    setOffset(clampOffset({ x: nx, y: ny }, geom.maxOx, geom.maxOy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  async function handleApply() {
    if (!bitmap) return;
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      const k = OUT_LONG / Math.max(geom.Fw, geom.Fh);
      paint(out, k);
      const blob = await new Promise<Blob | null>((res) =>
        out.toBlob(res, "image/jpeg", 0.9),
      );
      if (!blob) {
        onApply(file); // 폴백: 원본
        return;
      }
      const name = file.name.replace(/\.\w+$/, "") + ".jpg";
      onApply(new File([blob], name, { type: "image/jpeg" }));
    } finally {
      setBusy(false);
    }
  }

  const sliderCls =
    "h-1 w-full cursor-pointer appearance-none rounded-full bg-wabi-border accent-wabi-accent";

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-wabi-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-wabi-border px-4 py-3">
          <h2 className="text-sm font-medium text-wabi-fg">
            사진 편집{" "}
            {total > 1 && (
              <span className="font-numeric text-wabi-fg-muted">
                {index + 1}/{total}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="편집 취소"
            className="flex size-8 items-center justify-center rounded text-wabi-fg-muted transition hover:bg-wabi-muted hover:text-wabi-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* 미리보기 — 뷰포트 안에서 드래그로 위치 조정 */}
          <div className="flex justify-center">
            <div
              className="relative touch-none select-none overflow-hidden border border-wabi-border bg-wabi-muted"
              style={{ width: geom.Fw, height: geom.Fh, cursor: bitmap ? "grab" : "default" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <canvas ref={canvasRef} className="block" />
              {!bitmap && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-wabi-fg-muted">
                  불러오는 중…
                </div>
              )}
            </div>
          </div>

          {/* 비율 + 회전 */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {RATIOS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setRatio(r.value);
                  reclamp(r.value, rotation, zoom);
                }}
                aria-pressed={ratio === r.value}
                className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                  ratio === r.value
                    ? "border-wabi-fg bg-wabi-fg text-wabi-bg"
                    : "border-wabi-border text-wabi-fg-muted hover:border-wabi-fg hover:text-wabi-fg"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const rot = (rotation + 90) % 360;
                setRotation(rot);
                reclamp(ratio, rot, zoom);
              }}
              aria-label="90도 회전"
              className="ml-auto flex items-center gap-1 rounded border border-wabi-border px-2.5 py-1 text-xs text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
            >
              <RotateCw className="size-3.5" /> 회전
            </button>
          </div>

          {/* 확대 + 필터 슬라이더 */}
          <div className="mt-4 space-y-3">
            <Slider
              label="확대"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(v) => {
                setZoom(v);
                reclamp(ratio, rotation, v);
              }}
              className={sliderCls}
            />
            <Slider
              label="밝기"
              min={0.5}
              max={1.5}
              step={0.01}
              value={brightness}
              onChange={setBrightness}
              className={sliderCls}
            />
            <Slider
              label="대비"
              min={0.5}
              max={1.5}
              step={0.01}
              value={contrast}
              onChange={setContrast}
              className={sliderCls}
            />
            <Slider
              label="채도"
              min={0}
              max={2}
              step={0.01}
              value={saturate}
              onChange={setSaturate}
              className={sliderCls}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setRatio(null);
              setRotation(0);
              setZoom(1);
              setOffset({ x: 0, y: 0 });
              setBrightness(1);
              setContrast(1);
              setSaturate(1);
            }}
            className="mt-3 text-xs text-wabi-fg-muted underline underline-offset-2 transition-colors hover:text-wabi-fg"
          >
            초기화
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-wabi-border px-4 py-3">
          <button
            type="button"
            onClick={() => onApply(file)}
            className="rounded-none border border-wabi-border px-4 py-2 text-sm text-wabi-fg-muted transition-colors hover:border-wabi-fg hover:text-wabi-fg"
          >
            원본 그대로
          </button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!bitmap || busy}
            className="rounded-none bg-wabi-accent hover:bg-wabi-accent/90 disabled:opacity-60"
          >
            {busy ? "처리 중…" : total > 1 && index < total - 1 ? "적용 · 다음" : "적용"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  className,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  className: string;
}) {
  return (
    <label className="flex items-center gap-3 text-xs text-wabi-fg-muted">
      <span className="w-8 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={className}
      />
    </label>
  );
}
