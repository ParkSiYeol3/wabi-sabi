import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
