# Current Product Status

## Operational workflow

The only active Picker Pro workflow is **manual review** at `/review`.

1. Enter the source page, source row, raw text, and at least one product
   identifier (barcode, SKU, or product name).
2. Enter cases and individual units in separate fields.
3. The service resolves the row against `catalogs/products.json`.
4. Only verified, unambiguous matches with an allowed unit type are aggregated.
5. All other rows are returned as review issues and remain outside totals.

The request is not stored. Its generated review ID exists only to connect the
returned page/row source references to that response.

## Quantity policy

- Cases and units are explicit fields.
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

- Camera capture, image/PDF upload processing, OCR, and parser automation.
- Persisted jobs, review decisions, export files, cities, routes, and offline
  recovery.
- AI assistance.

Those capabilities must be rebuilt against the Foundation contracts and added
only with auditable tests and verified data.
