import { Container } from "@/components/container";

// 법적고지 3종 공용 골격 (#106) — 제목·시행일·본문 타이포.
export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="py-16">
      <h1 className="text-2xl font-semibold tracking-wide">{title}</h1>
      <p className="mt-2 text-xs text-wabi-fg-muted">시행일 {effectiveDate}</p>
      <div className="mt-10 max-w-3xl space-y-8 text-sm leading-7 text-wabi-fg-muted">
        {children}
      </div>
    </Container>
  );
}

export function Article({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-medium text-wabi-fg">{heading}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}
