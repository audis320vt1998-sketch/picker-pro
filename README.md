# Picker Pro

Picker Pro is a Hebrew-first order-picking application built with Next.js and
TypeScript. Its current working workflow is a safe, non-persistent **manual
review** of order rows.

## Current status

Available now:

- A Hebrew right-to-left manual-review screen at `/review`.
- Explicit, separate input fields for cases and individual units.
- Product resolution in the order barcode → SKU → canonical name → alias.
- Source traceability for every accepted quantity (page and row).
- Validation for unresolved, conflicting, unverified, and case-only products.
- Aggregation that never converts or merges cases and units.

Not available yet:

- OCR, camera, image, or PDF processing.
- Stored jobs, a persistent review queue, exports, city/route grouping, or AI
  assistance.

The canonical file [`catalogs/products.json`](./catalogs/products.json) is
loaded and validated at runtime. At the moment all nine catalog entries are
marked `unverified`, so the application correctly produces review items rather
than an operational pick list until the product catalog is confirmed.

See [Current Status](./docs/00_Current_Status.md) for the precise operating
boundary and [Legacy Module Isolation](./docs/23_Legacy_Module_Isolation.md)
for code that is deliberately outside the active build.

## Operating rules

1. Cases and individual units are separate source fields and separate totals.
2. A quantity is never divided by pack size or converted into a remainder.
3. Barcode has priority, followed by SKU, name, and alias. A product with a
   catalog barcode is not resolved by name alone.
4. Only a `verified` catalog match can enter an operational total.
5. A case-only product, or a product that does not allow unit picking, is sent
   to review if it has a positive individual-unit value.
6. Every accepted value retains its source page and row.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/review`.

## Verify

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Active structure

```text
app/
  review/                 Manual-review screen
  api/manual-review/      Non-persistent validation API
catalogs/products.json    Canonical product catalog
lib/catalog/              Verified catalog loader and resolver
lib/foundation/           Explicit-row processing and aggregation
lib/manual-review/        Request-to-result workflow
```

The numbered design documents in [`docs/`](./docs/) describe the target
architecture. Consult the Current Status document before treating a feature in
those documents as implemented.

## License

MIT
