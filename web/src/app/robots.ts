import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 인증·장바구니·마이페이지는 색인 제외
      disallow: ["/auth", "/cart", "/mypage", "/admin"],
    },
    sitemap: "https://wasa.kr/sitemap.xml",
  };
}
