# Current Product Status

## Operational workflow

Picker Pro has two active, non-persistent workflows:

- **Manual review** at `/review`.
- **Maayan OCR preflight** at `/upload`, which returns a table draft that must
  be checked before any manual-review entry.

After explicitly checking selected OCR rows against the source document, a
user may transfer a minimal, one-time browser draft from `/upload` to
`/review`. The transfer is held in session storage for at most 15 minutes and
is removed as soon as the review screen reads it. It carries source page/row
and product identifiers only, plus the three OCR source quantities for visual
comparison. It does not carry a filename, original image, customer/header
text, full OCR trace, catalog result, or an API request.

Manual review remains the only workflow that can evaluate an explicit row
against the catalog.

1. Enter the source page, source row, raw text, and at least one product
   identifier (barcode, SKU, or product name).
2. Enter cases and individual units in separate fields.
3. The service resolves the row against `catalogs/products.json`.
4. Only verified, unambiguous matches with an allowed unit type are aggregated.
5. All other rows are returned as review issues and remain outside totals.

The request is not stored. Its generated review ID exists only to connect the
returned page/row source references to that response.

## OCR preflight boundary

- `/api/intake/preflight` accepts one JPEG, PNG, or WebP image at a time.
- It accepts at most a 12 MB image with at most 24 million pixels and runs one
  OCR worker per Node process at a time.
- It requires a sufficiently high-resolution table image and reports
  `IMAGE_TOO_LOW_RESOLUTION` rather than parsing low-resolution full-page
  photos.
- It returns only table-body fields: product identifiers, product name, the
  three source quantity columns, confidence, row bounds, and parser issues.
- On a high-resolution Maayan close-up, it may first use a numeric-only
  calibration pass. That pass requires at least four vertically aligned SKU
  candidates, one unambiguous barcode per accepted row, and all three source
  quantity values. It omits a row instead of guessing any missing value.
- It never returns the filename, document header, customer information, full
  OCR text, original image, catalog match, totals, or a pick list.
- The result is `NEEDS_REVIEW`. A user-initiated browser handoff can display
  its source quantities beside the manual form, but they are never mapped to,
  or sent as, the manual-review `cases` or `units` fields.

## Quantity policy

- Cases and units are explicit fields; a transferred OCR draft leaves both
  blank until a user enters them.
- A targeted numeric draft can have no readable printed source-row number. It
  remains visible for comparison, but it cannot be transferred automatically
  to manual review; enter that source row explicitly instead.
- Values are checked only for being finite and non-negative.
- The application never splits, converts, or infers quantities from pack size,
  parentheses, or a `1/N` pattern.
- A zero value is preserved with its source reference.

## Catalog policy

- `catalogs/products.json` is the only active product source.
- Identifier priority is barcode, SKU, canonical name, then alias.
- Name/alias matching is disabled for a catalog product that already has a
  barcode, preventing a name-only match from bypassing that identifier.
- An `unverified` record produces a `PRODUCT_UNVERIFIED` review issue.
- The current catalog has no verified records, so a user cannot yet generate an
  operational pick list. This is intentional.

## Unavailable capabilities

- Camera capture, PDF processing, perspective correction, stored OCR jobs,
  and operational or automatic image-to-pick-list processing.
- Persisted jobs, review decisions, export files, cities, routes, and offline
  recovery.
- AI assistance.

Those capabilities must be rebuilt against the Foundation contracts and added
only with auditable tests and verified data.
