import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 인증·장바구니·결제·마이페이지·어드민은 색인 제외
      disallow: ["/auth", "/cart", "/checkout", "/mypage", "/admin"],
    },
    sitemap: "https://wasa.kr/sitemap.xml",
  };
}
