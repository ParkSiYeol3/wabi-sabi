import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-wabi-footer text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="font-serif-jp text-base">わび-さび</span>
          <span className="text-xs tracking-[0.2em] text-white/70">
            {site.name}
          </span>
        </div>
        <nav
          className="mt-6 flex items-center justify-center gap-5 text-xs text-white/70"
          aria-label="고객 안내"
        >
          <Link href="/notice" className="hover:text-white">
            공지사항
          </Link>
          <Link href="/inquiry" className="hover:text-white">
            문의
          </Link>
          <Link href="/review" className="hover:text-white">
            리뷰
          </Link>
        </nav>
        <p className="mt-6 text-xs text-white/50">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
