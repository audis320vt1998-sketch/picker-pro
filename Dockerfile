# syntax=docker/dockerfile:1.26.0
# check=error=true

ARG NODE_VERSION=24-trixie-slim

FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PICKER_PRO_STANDALONE_BUILD=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PICKER_PRO_OCR_CACHE=/var/cache/picker-pro-ocr \
    PICKER_PRO_PDFINFO_PATH=/usr/bin/pdfinfo \
    PICKER_PRO_PDFTOPPM_PATH=/usr/bin/pdftoppm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
        /usr/local/lib/node_modules/corepack \
        /usr/local/lib/node_modules/npm \
        /usr/local/bin/corepack \
        /usr/local/bin/npm \
        /usr/local/bin/npx \
        /usr/local/bin/pnpm \
        /usr/local/bin/pnpx \
        /usr/local/bin/yarn \
        /usr/local/bin/yarnpkg \
    && mkdir -p /app/.next/cache /var/cache/picker-pro-ocr \
    && chown -R node:node /app/.next /var/cache/picker-pro-ocr

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/scripts/staging-runtime-canary.cjs ./scripts/staging-runtime-canary.cjs

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "const http=require('node:http');const port=Number(process.env.PORT||3000);http.get({host:'127.0.0.1',port,path:'/api/health'},response=>process.exit(response.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

CMD ["node", "server.js"]
