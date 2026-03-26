import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/albatime',
  images: { unoptimized: true },
};
export default nextConfig;
