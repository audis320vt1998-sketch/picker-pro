/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep `next start` available for ordinary Node deployments while the
  // container build opts into Next.js' minimal standalone server.
  output:
    process.env.PICKER_PRO_STANDALONE_BUILD === '1'
      ? 'standalone'
      : undefined,
  reactStrictMode: true,
  // Tesseract starts a Node worker from its own package path. Keeping it
  // external preserves that worker path in API routes instead of bundling it
  // into a Next.js route chunk.
  serverExternalPackages: ['tesseract.js'],
  // The worker and WASM core are resolved dynamically by Tesseract. Include
  // both packages explicitly so standalone container builds retain them.
  outputFileTracingIncludes: {
    '/api/intake/preflight': [
      'node_modules/tesseract.js/**/*',
      'node_modules/tesseract.js-core/**/*',
    ],
    '/api/intake/pdf-preflight': [
      'node_modules/tesseract.js/**/*',
      'node_modules/tesseract.js-core/**/*',
    ],
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
