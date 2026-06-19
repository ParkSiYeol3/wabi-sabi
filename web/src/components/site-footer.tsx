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
        <p className="mt-6 text-xs text-white/50">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
