# Current Product Status

## Operational workflow

Picker Pro has two active, non-persistent workflows:

- **Manual review** at `/review`.
- **Maayan OCR preflight** at `/upload`, which returns a table draft that must
  be checked before any manual-review entry.

The upload screen accepts up to 20 images as a browser-only batch, or one PDF
of up to 20 pages. Images are sent to the one-image preflight endpoint
sequentially; a PDF is rendered into temporary local PNG pages and then
processed sequentially. It assigns stable page numbers in selected or original
PDF order, and does not display or retain file names in the result. Before
upload, the browser rejects unsupported, empty, or oversized input; the
endpoint independently repeats those checks. PDF processing requires Poppler
`pdfinfo` and `pdftoppm` on the server, or the corresponding
`PICKER_PRO_PDFINFO_PATH` and `PICKER_PRO_PDFTOPPM_PATH` configuration.

On a narrow phone screen, the OCR result keeps one semantic table but reflows
each source row into a labeled card for readable product identifiers,
quantities, OCR checks, and transfer selection. When OCR completes, focus
moves to the result heading and a short status announces the outcome; the full
OCR table is not placed in a live region.

When one or more fields have low OCR confidence, the upload result also shows
a temporary browser-only review list and can filter the visible rows to those
items. It is derived only from fixed parser issue codes, contains no source
text, and is cleared when the selection changes or the page is left; it is not
a stored review queue.

Before OCR begins, the reviewer can see generic page positions only, move a
selected image up or down, or remove it from the batch. This changes only the
browser-held selection: the opaque source reference remains with its selected
image and the final order becomes the OCR page numbering. File names are never
displayed. Once OCR starts, that batch order is locked; selecting a new batch
is required to make a different order. Any new source choice — camera capture,
existing images, or PDF — waits for explicit confirmation before it replaces a
browser-held selection or OCR draft.

On a supported mobile browser, the same screen offers a camera-first,
direct-camera chooser for one document image. It guides the reviewer to take
one sharp, straight, shadow-free table photo, then allows a browser-only local
preview before OCR. While a camera photo or image replacement is selected, the
browser also reads only its local image metadata and gives an advisory result
for media type, the same minimum dimensions, and the same pixel limit as the
server. It does not upload or retain the photo, inspect OCR text, judge
sharpness or shadows, or prevent the reviewer from requesting the server
check. A confirmed capture receives a new opaque source reference and is not
uploaded until the reviewer explicitly starts OCR. The browser may offer a
regular file chooser instead of a camera, so camera availability is never
assumed.

For the known temporary OCR states (busy, timeout, or unavailable), the user
may explicitly retry that one page. The screen never retries automatically or
in parallel. It reuses the same browser-held image, selected-order page number,
opaque document reference, and neutral multipart filename; it does not
persist the image, retry attempt, filename, or server error text.

After an image is rejected or produces an unusable draft, a reviewer can
explicitly choose a clearer replacement photo for that same logical page. The
prior page draft/failure and its selected rows are removed before the new image
is sent, and the reviewer must explicitly start OCR again. Other pages remain
unchanged. The replacement retains that page's opaque reference only because
it is a new photo of the same page; a different document or page requires a
new batch. On a supported mobile browser, the replacement control also offers
a single-image camera chooser. It follows exactly the same replacement path
and validation as a file selection; the browser may instead open a file
chooser.

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

When the review screen opens, it shows a server-derived catalog-readiness
notice with only the catalog version and product counts. The active version
1.3.0 contains 124 verified records imported from the complete catalog supplied
for this project, so exact barcode/SKU matches can enter an operational total.
If a future catalog has no verified products, the screen instead states before
the form is filled that no operational total can be produced and links to the
read-only catalog onboarding guidance. It never sends catalog records to the
browser.

1. Enter the source page, source row, raw text, and at least one product
   identifier (barcode, SKU, or product name).
2. Enter cases and individual units in separate fields.
3. The service resolves the row against `catalogs/products.json`.
4. Only verified, unambiguous matches with an allowed unit type are aggregated.
5. All other rows are returned as review issues and remain outside totals.

Before sending, the review screen shows how many rows are ready and marks each
row as ready, missing values, or requiring correction. This is a client-side
completeness check only: it never copies an OCR quantity into a manual field,
infers a pack size, or converts cases and units.

When a row carries the opaque document reference from OCR, the client and API
reject a duplicate combination of document reference, page, and printed row.
This prevents a checked OCR row from being aggregated twice. Direct manual
rows without that reference remain supported and are not assigned a document
identity automatically.

The request is not stored. Its generated review ID exists only to connect the
returned page/row source references to that response. The submitted manual
source text is used only while evaluating that request and is never included
in returned source references. Every manual-review response is non-cacheable;
the review screen maps expected API failure codes to fixed Hebrew guidance
instead of displaying server error text. Review-issue labels and explanations
are likewise fixed by their known code rather than copied from API messages.
Before placing a successful response in browser state, the review screen also
whitelists its nested result shape and retains only catalog counts, product
totals, fixed issue metadata, and page/row positions. It drops server review
identifiers, source text, source IDs, and arbitrary response fields.

The result explicitly separates rows accepted into the operational total,
rows excluded from it, and non-blocking warnings. A warning is not counted as
an excluded row.

For every verified product total, the review result can expand two separate
source lists: one for cases and one for individual units. Each displayed entry
contains only its page and printed row. The result does not expose source text,
file names, opaque document references, or a quantity contribution per source;
the current Foundation contract retains source references but not an individual
quantity value for each reference.

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
- Every displayed table field has its own OCR confidence. A low-confidence
  field becomes a non-persistent review issue with fixed UI guidance; it does
  not accept, reject, convert, or automatically transfer a quantity.
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
- When a verified catalog product permits individual-unit picking and has a
  positive case size, an explicit unit quantity that reaches or exceeds that
  case size remains an individual-unit quantity and receives a non-blocking
  review warning. It is never converted into cases.
- A zero value is preserved with its source reference.

## Catalog policy

- `catalogs/products.json` is the only active product source.
- Identifier priority is barcode, SKU, canonical name, then alias.
- Name/alias matching is disabled for a catalog product that already has a
  barcode, preventing a name-only match from bypassing that identifier.
- For products without a catalog barcode, name/alias comparison normalizes
  only Hebrew marks, whitespace, dashes, quote variants, and Latin case. It
  never transliterates, guesses, or fuzzy-matches a product name.
- An `unverified` record produces a `PRODUCT_UNVERIFIED` review issue.
- The active catalog is version 1.3.0 with 124 verified records imported from
  the complete user-supplied product catalog. Exact barcode/SKU matches can
  enter the manual-review operational total; unresolved, conflicting, and
  disallowed unit rows remain in review.
- Individual-unit permission is enforced by one catalog policy: a product must
  explicitly allow unit picking and must not be case-only. The policy never
  converts an entered quantity according to pack size.
- `/settings` reports catalog readiness, offers a header-only UTF-8 CSV
  onboarding template, and can run a temporary structural check on one
  completed CSV. The check requires `unverified` candidate rows, returns only
  fixed issue codes with row/field locations, and never returns a filename or
  source cell text. It does not upload for storage, import, modify, or verify
  catalog records. A human must review the completed template against the
  authoritative warehouse catalog before a controlled update to
  `catalogs/products.json`.

## Unavailable capabilities

- Perspective correction, stored OCR jobs, and operational or automatic
  image/PDF-to-pick-list processing.
- The legacy `/api/process` endpoint is deliberately disabled. It returns a
  fixed, non-cacheable `501` response without parsing an uploaded request; it
  is not an alternative to `/api/intake/preflight`.
- Persisted jobs, review decisions, export files, cities, routes, and offline
  recovery.
- AI assistance.

Those capabilities must be rebuilt against the Foundation contracts and added
only with auditable tests and verified data.
