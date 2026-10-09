import type { NextConfig } from "next";

// Next reads .env files for the app, but not before it evaluates this config, so
// load it here ourselves. Node has this built in, no dependency.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local (CI, prod) - the variables come from the platform instead
}

// The dev server is reached through Caddy under a real domain, not localhost, so
// that origin must be allowed. No domain is written here - it comes from the env,
// comma-separated if there is ever more than one.
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  // The pages were called Settlements before the owner chose Payouts (Feature 6003): old
  // addresses, in bookmarks and earlier emails, still arrive.
  async redirects() {
    return [
      { source: "/ops/settlements", destination: "/ops/payouts", permanent: false },
      { source: "/contractor/settlements", destination: "/contractor/payouts", permanent: false },
      { source: "/contractor/settlements/:ref", destination: "/contractor/payouts/:ref", permanent: false },
    ];
  },
};

export default nextConfig;
