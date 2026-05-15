// next.config.mjs
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  experimental: {
    reactCompiler: true, // ← move here
  },
};

export default pwaConfig(nextConfig);
