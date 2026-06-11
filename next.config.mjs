// next.config.mjs
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: true,
});

const nextConfig = {
  experimental: {
    reactCompiler: false,
  },
};

export default pwaConfig(nextConfig);
