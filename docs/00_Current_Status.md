# Current Product Status

## Operational workflow

Picker Pro has two active, non-persistent workflows:

- **Manual review** at `/review`.
- **Maayan OCR preflight** at `/upload`, which returns a table draft that must
  be checked before any manual-review entry.

The upload screen accepts up to 20 images as a browser-only batch and sends
them to the one-image preflight endpoint sequentially. It assigns stable
page numbers in the selected order; a failure on one image does not discard
the drafts from other images. It does not display or retain file names in the
result. Before upload, the browser rejects an unsupported, empty, or over-12
MB selected image as an early UX guard; the endpoint independently repeats
those checks.

For the known temporary OCR states (busy, timeout, or unavailable), the user
may explicitly retry that one page. The screen never retries automatically or
in parallel. It reuses the same browser-held image, selected-order page number,
opaque document reference, and neutral multipart filename; it does not
persist the image, retry attempt, filename, or server error text.

A reviewer can explicitly open one selected source image at a time beside its
OCR draft, including after OCR fails for that image. It is the original image,
so it may contain document or customer details. The preview is a local browser
object URL, is never returned by the OCR API or included in the handoff, and
is revoked when it is hidden, the selected batch is replaced, or the upload
screen is left. The image is sent for OCR only when the user selects the
preflight action; the browser form uses a neutral upload filename.

After explicitly checking selected OCR rows against the source document, a
user may transfer a minimal, one-time browser draft from `/upload` to
`/review`. The transfer is held in session storage for at most 15 minutes and
is removed as soon as the review screen reads it. It carries an opaque,
random document reference, source page/row, and product identifiers only,
plus the three OCR source quantities for visual comparison. It does not carry
a filename, original image, customer/header text, full OCR trace, catalog
result, or an API request.

Manual review remains the only workflow that can evaluate an explicit row
against the catalog.

1. Enter the source page, source row, raw text, and at least one product
   identifier (barcode, SKU, or product name).
2. Enter cases and individual units in separate fields.
3. The service resolves the row against `catalogs/products.json`.
4. Only verified, unambiguous matches with an allowed unit type are aggregated.
5. All other rows are returned as review issues and remain outside totals.

When a row carries the opaque document reference from OCR, the client and API
reject a duplicate combination of document reference, page, and printed row.
This prevents a checked OCR row from being aggregated twice. Direct manual
rows without that reference remain supported and are not assigned a document
identity automatically.

The request is not stored. Its generated review ID exists only to connect the
returned page/row source references to that response.

## OCR preflight boundary

- `/api/intake/preflight` accepts one JPEG, PNG, or WebP image at a time; the
  upload screen calls it sequentially for a selected batch of up to 20 images.
- It accepts at most a 12 MB image with at most 24 million pixels and runs one
  OCR worker per Node process at a time.
- Browser-side selection checks are informational only. The endpoint remains
  authoritative for media type, byte count, image header, dimensions, and all
  OCR availability decisions.
- It compares the declared JPEG, PNG, or WebP media type with the detected
  raster header before OCR; a mismatch is rejected without storing the image.
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
- The upload screen can render an explicitly opened local image preview, but
  that preview is not part of the API response, session-storage handoff, or
  manual-review request. It can reveal original document/customer details to
  the person who opens it, so it is not treated as a PII-free review surface.
- A retry button appears only after a known temporary OCR failure and requires
  an explicit user action for that page. Validation/content failures and an
  unrecognized response are not retried with the same image. The UI displays
  fixed Hebrew guidance rather than API error text.
- The result is `NEEDS_REVIEW`. A user-initiated browser handoff can display
  its source quantities beside the manual form, but they are never mapped to,
  or sent as, the manual-review `cases` or `units` fields.
- The manual-review API accepts only defined row fields. It rejects a source
  filename or any other unrecognized row metadata without echoing it back to
  the browser.

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
