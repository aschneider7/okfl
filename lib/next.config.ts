import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  ...(process.env.OKFL_SKIP_STANDALONE_BUILD==="1"?{}:{output:"standalone" as const}),
  reactStrictMode:true,
};
export default nextConfig;
