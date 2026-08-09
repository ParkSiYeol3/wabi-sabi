import { cn } from "@/lib/utils";

// 중앙 정렬 컨테이너 (max-w 1200px = max-w-300, Tailwind v4 canonical)
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-300 px-5", className)}>
      {children}
    </div>
  );
}
