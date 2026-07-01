import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상품 이미지 업로드(서버 액션 FormData) — 기본 1MB → 다중 이미지 허용
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    // Supabase Storage 상품 이미지 허용 (next/image)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zeqtfrwjnlckyinjxjcu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
