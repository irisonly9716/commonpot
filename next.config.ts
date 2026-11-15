import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets pages call forbidden() to answer 403 (the site admin dashboard).
  experimental: { authInterrupts: true },
};

export default nextConfig;
