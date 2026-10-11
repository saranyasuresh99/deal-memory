import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API routes read the raw CRM export at runtime to verify citations against it (rule 5).
  // Make sure Vercel bundles the file with those routes.
  outputFileTracingIncludes: {
    "/api/*": ["./data/raw/crm_export.csv"],
  },
};

export default nextConfig;
