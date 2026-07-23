# Picker Pro

Picker Pro is a Hebrew-first order-picking application built with Next.js and
TypeScript. Its current working workflow is a safe, non-persistent **manual
review** of order rows.

## Current status

Available now:

- A Hebrew right-to-left manual-review screen at `/review`.
- Explicit, separate input fields for cases and individual units.
- A read-only catalog status on `/settings`, a UTF-8 CSV handoff template,
  and a temporary structural check for a completed CSV. The check never saves,
  imports, or verifies catalog entries and returns no uploaded product values.
- A camera-first, browser-provided direct-camera chooser for one document image
  at `/upload`, with a local preview and an advisory browser-only size/type
  check before OCR. The check does not upload, store, or inspect OCR text; it
  uses the same dimensions and pixel limit as the server and still requires a
  human check for focus and shadows. An explicit confirmation is required
  before a new source choice (camera capture, image batch, or PDF) replaces
  existing browser-held work. It does not upload or process the image until
  the reviewer explicitly starts OCR.
- A browser-only batch at `/upload` for up to 20 Maayan images, or one
  multi-page PDF of up to 20 pages. It processes one page at a time and returns only transient, review-required table
  drafts with stable page numbers. Before OCR, the reviewer can reorder or
  remove generic page positions without seeing a file name; the final local
  order becomes the page numbering. The browser gives an early rejection for
  unsupported, empty, or oversized images, while the server remains the
  authoritative boundary. A failed page can be retried only by explicit user
  action when OCR is temporarily busy, timed out, or unavailable; it never
  retries automatically. A reviewer can explicitly replace only one logical
  page with a clearer photo, then separately request OCR again without
  discarding drafts from the other pages.
- An opt-in, temporary source-image preview beside each draft, so a reviewer
  can compare a row with the selected image before handoff. Only one preview
  is open at a time; it may show the original document or customer details,
  stays in browser memory, and is never included in the OCR result or review
  handoff.
- For a sufficiently clear Maayan close-up, a calibrated numeric OCR pass can
  recover repeated SKU/barcode/quantity rows as a review-only draft. It never
  creates totals, resolves the catalog, or fills manual quantities.
- A one-time, browser-only handoff of explicitly checked OCR identifiers to
  `/review`; source quantities are comparison-only and the manual case/unit
  fields remain blank.
- An opaque source reference per logical document page prevents the same OCR
  document/page/row from being submitted twice. A clearer replacement photo
  of that page retains the reference, while an unrelated page needs a new
  batch. No file name or document header is retained in that reference; the
  manual-review API rejects source filenames and other unrecognized row
  metadata.
- Product resolution in the order barcode → SKU → canonical name → alias.
- Source traceability for every accepted quantity (page and row), with an
  expandable results view that separates case sources from individual-unit
  sources without exposing document text or file information.
- Validation for unresolved, conflicting, unverified, and case-only products.
- Aggregation that never converts or merges cases and units.

Not available yet:

- Automatic pick-list creation from an image or PDF.
- Stored jobs, a persistent review queue, exports, city/route grouping, or AI
  assistance.
- Automatic catalog verification or ERP synchronization.

The canonical file [`catalogs/products.json`](./catalogs/products.json) is
loaded and validated at runtime. Version 1.3.0 contains 124 verified products
from the complete catalog supplied for this project. An exact barcode or SKU
match can therefore enter an operational manual-review total; unrecognized,
conflicting, or disallowed unit rows still remain in review.

See [Current Status](./docs/00_Current_Status.md) for the precise operating
boundary and [Legacy Module Isolation](./docs/23_Legacy_Module_Isolation.md)
for code that is deliberately outside the active build.

## Operating rules

1. Cases and individual units are separate source fields and separate totals.
2. A quantity is never divided by pack size or converted into a remainder.
   An OCR source quantity is never copied automatically into a manual case or
   individual-unit field.
3. Barcode has priority, followed by SKU, name, and alias. A product with a
   catalog barcode is not resolved by name alone.
4. Only a `verified` catalog match can enter an operational total.
5. A case-only product, or a product that does not allow unit picking, is sent
   to review if it has a positive individual-unit value.
6. For an individual-unit product with a positive catalog case size, an entered
   unit quantity at or above that size stays in the unit total and is flagged
   for non-blocking review; it is never converted into cases.
7. Every accepted value retains its source page and row.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/upload` for OCR preflight, or
`http://localhost:3000/review` for explicit manual review.

PDF preflight additionally requires local Poppler commands `pdfinfo` and
`pdftoppm` on the server PATH. Set `PICKER_PRO_PDFINFO_PATH` and
`PICKER_PRO_PDFTOPPM_PATH` when they are installed elsewhere.

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
  api/intake/preflight/   One-image OCR draft endpoint
  api/manual-review/      Non-persistent validation API
catalogs/products.json    Canonical product catalog
lib/catalog/              Verified catalog loader and resolver
lib/foundation/           Explicit-row processing and aggregation
lib/document-intake/      Maayan profile, OCR preflight, and source parser
lib/manual-review/        Request-to-result workflow
```

The numbered design documents in [`docs/`](./docs/) describe the target
architecture. Consult the Current Status document before treating a feature in
those documents as implemented.

## License

MIT
