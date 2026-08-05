/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Tesseract starts a Node worker from its own package path. Keeping it
    // external preserves that worker path in API routes instead of bundling it
    // into a Next.js route chunk.
    serverComponentsExternalPackages: ['tesseract.js'],
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
