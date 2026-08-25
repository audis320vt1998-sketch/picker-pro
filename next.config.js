// Tesseract starts a separate Node worker whose dynamic imports are invisible
// to Next.js' output tracer. Keep the worker's Node-only dependency closure in
// the standalone image alongside Tesseract itself.
const tesseractWorkerRuntimeFiles = [
  'node_modules/bmp-js/**/*',
  'node_modules/is-electron/**/*',
  'node_modules/is-url/**/*',
  'node_modules/node-fetch/**/*',
  'node_modules/regenerator-runtime/**/*',
  'node_modules/tesseract.js/**/*',
  'node_modules/tesseract.js-core/package.json',
  'node_modules/tesseract.js-core/tesseract-core-{,simd-}lstm.{js,wasm}',
  'node_modules/tr46/**/*',
  'node_modules/wasm-feature-detect/**/*',
  'node_modules/webidl-conversions/**/*',
  'node_modules/whatwg-url/**/*',
]

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
  // The worker, its runtime dependencies, and the WASM core are resolved
  // dynamically by Tesseract. Include them explicitly in standalone builds.
  outputFileTracingIncludes: {
    '/api/intake/preflight': tesseractWorkerRuntimeFiles,
    '/api/intake/pdf-preflight': tesseractWorkerRuntimeFiles,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
