"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, ImagePlus } from "lucide-react";
import { ImageEditor } from "@/components/admin/image-editor";

// 상품 이미지 선택 + 간단 편집(비율 크롭·회전·필터) 묶음.
// 폼 제출은 name 을 가진 hidden file input 으로 하되, 선택·편집된 File 목록을
// DataTransfer 로 그 input.files 에 동기화한다(부모 폼 코드는 그대로 files 를 읽는다).
// 편집기는 선택 즉시 큐로 순회하고, 썸네일의 연필로 개별 재편집한다.

const isImage = (f: File) => f.type.startsWith("image/");

type Batch = {
  queue: File[];
  index: number;
  results: File[];
  replaceAt: number | null; // 기존 썸네일 재편집이면 그 인덱스, 새 선택이면 null
};

export function ProductImagePicker({
  name,
  onFilesChange,
}: {
  name: string;
  onFilesChange?: (count: number) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLInputElement>(null);

  // 선택·편집된 목록을 제출용 hidden input 에 동기화(DataTransfer).
  useEffect(() => {
    const input = hiddenRef.current;
    if (input) {
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(f);
      input.files = dt.files;
    }
    onFilesChange?.(files.length);
  }, [files, onFilesChange]);

  function startBatch(picked: File[], replaceAt: number | null) {
    const imgs = picked.filter(isImage);
    if (imgs.length === 0) return;
    setBatch({ queue: imgs, index: 0, results: [], replaceAt });
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // 같은 파일 재선택 허용
    startBatch(picked, null);
  }

  function onEditorApply(edited: File) {
    setBatch((b) => {
      if (!b) return null;
      const results = [...b.results, edited];
      if (b.index + 1 < b.queue.length) {
        return { ...b, index: b.index + 1, results };
      }
      // 배치 완료 — 새 선택은 뒤에 추가, 재편집은 해당 자리 교체.
      if (b.replaceAt === null) {
        setFiles((f) => [...f, ...results]);
      } else {
        const at = b.replaceAt;
        setFiles((f) => f.map((x, i) => (i === at ? results[0] : x)));
      }
      return null;
    });
  }

  function onEditorCancel() {
    // 배치 취소 — 새 선택은 버리고, 재편집은 원본 유지(둘 다 변경 없음).
    setBatch(null);
  }

  const removeAt = (i: number) =>
    setFiles((f) => f.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-2">
      {/* 제출용 — 실제 file input(숨김). files 를 DataTransfer 로 동기화. */}
      <input ref={hiddenRef} type="file" name={name} multiple accept="image/*" className="hidden" tabIndex={-1} aria-hidden />
      {/* 선택용 — name 없음(제출 안 됨). */}
      <input
        ref={selectRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onSelect}
      />

      <button
        type="button"
        onClick={() => selectRef.current?.click()}
        className="inline-flex w-fit items-center gap-2 border border-wabi-border px-3 py-2 text-sm text-wabi-fg transition-colors hover:border-wabi-fg hover:bg-wabi-muted"
      >
        <ImagePlus className="size-4" /> 이미지 선택 · 편집
      </button>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
              className="relative size-20 overflow-hidden rounded border border-wabi-border bg-wabi-muted"
            >
              <Thumb file={f} />
              <button
                type="button"
                onClick={() => startBatch([f], i)}
                aria-label={`${i + 1}번째 사진 편집`}
                className="absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`${i + 1}번째 사진 삭제`}
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
              >
                <X className="size-3" />
              </button>
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-wabi-fg px-1 text-[9px] leading-tight text-white">
                  대표
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {batch && (
        <ImageEditor
          // 파일마다 remount — 편집 상태를 기본값으로 초기화(내부 effect 리셋 대신).
          key={`${batch.replaceAt}-${batch.index}`}
          file={batch.queue[batch.index]}
          index={batch.index}
          total={batch.queue.length}
          onApply={onEditorApply}
          onCancel={onEditorCancel}
        />
      )}
    </div>
  );
}

// 썸네일 — object URL 을 lazy 초기값으로 만들고 언마운트 때 revoke(set-state-in-effect 회피).
// 파일이 바뀌면 부모가 key 로 remount 하므로 새 URL 이 만들어진다.
function Thumb({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // 편집 미리보기용 로컬 blob — next/image 대신 순수 img(최적화 불필요).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="size-full object-cover" />;
}
