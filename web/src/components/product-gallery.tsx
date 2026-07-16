"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// 상품 상세 이미지 갤러리 (#151). 썸네일을 누르면 메인 이미지가 바뀐다
// (이전엔 정적이라 여러 장을 올려도 첫 장만 크게 볼 수 있었다).
export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? null;
  const thumbs = images.slice(0, 4);

  return (
    <div>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-wabi-muted">
        {main ? (
          <Image
            src={main}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            preload
          />
        ) : (
          <ImageIcon
            className="size-12 text-wabi-fg-muted/40"
            strokeWidth={1}
            aria-hidden
          />
        )}
      </div>

      {thumbs.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {thumbs.map((src, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${name} 이미지 ${i + 1} 보기`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden bg-wabi-muted transition-opacity",
                  i === active
                    ? "ring-2 ring-wabi-fg ring-offset-2 ring-offset-wabi-bg"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
