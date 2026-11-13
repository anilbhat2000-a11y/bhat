import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Requests pass through proxy.ts, which buffers the body. Allow the largest upload
  // (a 500 MB video plus form overhead) through the proxy as well.

  partialPrefetching: true,
  experimental: {
    proxyClientMaxBodySize: "550mb",
    // forbidden() gives a real 403 page for out-of-scope records.
    authInterrupts: true,
    // Uploads go through server actions. Videos can be 500 MB, plus form overhead.
    serverActions: { bodySizeLimit: "550mb" },
  },
};

export default nextConfig;
