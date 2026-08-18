import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // Development-only opt-in; production behavior remains unchanged by default.
  allowedDevOrigins,
};

export default nextConfig;
