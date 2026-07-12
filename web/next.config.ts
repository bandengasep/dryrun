import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Compile the workspace backend library (Zod schemas etc.) directly from source.
  transpilePackages: ["@dryrun/core"],
  // Pin the monorepo root so Next doesn't misinfer it from stray parent lockfiles.
  turbopack: {
    root: path.resolve(import.meta.dirname, ".."),
  },
};

export default nextConfig;
