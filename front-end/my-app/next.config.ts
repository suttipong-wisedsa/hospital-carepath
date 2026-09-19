import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // proxy /api/* ไปยัง backend (Go) เพื่อหลีกเลี่ยงปัญหา CORS
  // frontend เรียก /api/... ก็จะถูก Next.js ส่งต่อไป http://localhost:8080/...
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
