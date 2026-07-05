import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link
        href="/admin/products"
        className="border border-wabi-border p-6 transition-colors hover:bg-wabi-subtle"
      >
        <h2 className="font-medium">상품 관리</h2>
        <p className="mt-1 text-sm text-wabi-fg-muted">
          상품 등록·수정·재고·노출
        </p>
      </Link>
      <Link
        href="/admin/orders"
        className="border border-wabi-border p-6 transition-colors hover:bg-wabi-subtle"
      >
        <h2 className="font-medium">주문 관리</h2>
        <p className="mt-1 text-sm text-wabi-fg-muted">주문 조회·송장 입력</p>
      </Link>
      <Link
        href="/admin/audit"
        className="border border-wabi-border p-6 transition-colors hover:bg-wabi-subtle"
      >
        <h2 className="font-medium">감사로그</h2>
        <p className="mt-1 text-sm text-wabi-fg-muted">어드민 액션 기록 조회</p>
      </Link>
    </div>
  );
}
