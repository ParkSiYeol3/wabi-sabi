import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 어드민 공통 프리미티브 — 페이지마다 제각각이던 border/space-y 를 통일한다.
// 크림 브랜드 톤: 흰 카드가 아니라 크림 배경 위 은은한 테두리 + 라운딩.

// 어드민 액션 버튼(대표님 — 밑줄 텍스트 링크가 직관적이지 않음 → 깔끔·큼직한
// 버튼). shadcn Button 의 outline 은 bg-background(흰색)이라 크림과 안 맞아,
// 브랜드 토큰(wabi-fg/border)으로 직접 짠다. 세 톤: solid(강조·on 상태),
// outline(기본·off 상태), danger(삭제). 눌림 피드백 active:scale.
export const adminAction = cva(
  "inline-flex h-9 items-center justify-center gap-1 rounded-md px-4 text-sm font-medium whitespace-nowrap transition active:scale-95 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        solid: "bg-wabi-fg text-white hover:bg-wabi-fg/90",
        outline:
          "border border-wabi-border bg-transparent text-wabi-fg hover:border-wabi-fg hover:bg-wabi-muted",
        danger:
          "border border-red-300 bg-transparent text-red-700 hover:border-red-400 hover:bg-red-50",
      },
    },
    defaultVariants: { tone: "outline" },
  },
);

// 페이지 상단 제목 + 선택적 설명·우측 액션. 각 어드민 페이지 최상단에 둔다.
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-wabi-fg">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-wabi-fg-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// 섹션 제목 — 대시보드 등에서 카드 그룹 위에.
export function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-sm font-semibold text-wabi-fg", className)}>
      {children}
    </h2>
  );
}

// 라운딩 + 테두리 카드. 크림 배경 위라 그림자는 아주 옅게(shadow-sm).
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-wabi-border bg-wabi-bg/40 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

// 통계 타일 — 라벨 + 큰 수치 + 아이콘. tone 으로 강조색(0 이면 무채색).
export function StatTile({
  label,
  value,
  unit,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | string;
  unit?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "accent" | "alert" | "warn";
  href?: string;
}) {
  const active = typeof value === "number" ? value > 0 : true;
  // 크림 배경(#f3ebdd) 기준 WCAG AA — red-600·amber-700 은 미달이라 한 단계 진하게.
  const valueColor =
    tone === "alert" && active
      ? "text-red-700"
      : tone === "warn" && active
        ? "text-amber-800"
        : tone === "accent"
          ? "text-wabi-fg"
          : active
            ? "text-wabi-fg"
            : "text-wabi-fg-muted";
  const ring =
    active && tone === "alert"
      ? "border-red-300"
      : active && tone === "warn"
        ? "border-amber-300"
        : "border-wabi-border";

  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-wabi-fg-muted">{label}</p>
        {Icon && (
          <Icon className="size-4 text-wabi-fg-muted/60" strokeWidth={1.8} />
        )}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", valueColor)}>
        {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
        {unit && <span className="ml-1 text-sm font-normal">{unit}</span>}
      </p>
    </>
  );

  const base = cn(
    "block rounded-xl border bg-wabi-bg/40 p-5 shadow-sm",
    ring,
    href && "transition-colors hover:bg-wabi-muted/50",
  );

  return href ? (
    <Link href={href} className={base}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

// 데이터 테이블 래퍼 — 가로 스크롤 + 라운딩 + 헤더 배경. 자식은 <table>.
export function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-wabi-border shadow-sm">
      {children}
    </div>
  );
}

// 빈 상태 — 목록/테이블이 비었을 때 일관된 안내.
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-wabi-border bg-wabi-bg/30 p-10 text-center text-sm text-wabi-fg-muted">
      {children}
    </div>
  );
}
