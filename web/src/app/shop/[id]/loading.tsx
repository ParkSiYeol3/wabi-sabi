import { Container } from "@/components/layout/container";

// 뼈대는 화면 한 장을 채워야 한다. 상품 상세는 본문이 5,000px 가 넘는데 뼈대는
// 1,100px 라, 뼈대일 때 푸터가 화면 안에 보이다가 본문이 들어오면 아래로 밀려났다
// (프로덕션 CLS 0.203 — 밀린 건 푸터 하나였다). 뼈대를 한 화면 높이로 잡아 두면
// 두 상태 모두에서 푸터가 접힌 선 아래에 있어 보이는 밀림이 없다.
export default function ProductLoading() {
  return (
    <Container className="min-h-svh py-16">
      <div className="grid gap-12 md:grid-cols-2">
        <div className="aspect-square animate-pulse bg-wabi-muted" />
        <div className="space-y-4">
          <div className="h-3 w-20 animate-pulse bg-wabi-muted" />
          <div className="h-7 w-2/3 animate-pulse bg-wabi-muted" />
          <div className="h-5 w-1/3 animate-pulse bg-wabi-muted" />
          <div className="h-24 w-full animate-pulse bg-wabi-muted" />
          <div className="h-12 w-full animate-pulse bg-wabi-muted" />
        </div>
      </div>
    </Container>
  );
}
