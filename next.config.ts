import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Uploads go through server actions. Videos can be 500 MB, plus form overhead.
    serverActions: { bodySizeLimit: "550mb" },
  },
};

export default nextConfig;
