import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-only "N" indicator defaults to bottom-left, where it covers the sidebar avatar.
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
