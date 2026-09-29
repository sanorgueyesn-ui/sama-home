import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app: avoids Turbopack picking up an
  // unrelated package-lock.json higher up in the user's home directory.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
