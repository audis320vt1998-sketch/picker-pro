# Current Product Status

## Operational workflow

Picker Pro has two active, non-persistent input workflows:

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
OCR table is not placed in a live region. A browser-only page navigator marks
one current OCR page, announces approved and attention-required page counts,
and can jump to another page draft, OCR failure, replacement-photo state, or
the next distinct page that requires attention. Attention navigation follows
document order, skips confirmed pages without warnings, and wraps once. It
prioritizes unresolved work when no active page is available, preserves an
explicitly selected page while it remains visible, and does not approve rows,
route codes, quantities, or create a stored queue. A confirmed page with low
OCR confidence remains included in both the approved count and the attention
count so the status never hides a source-document check.

When one or more fields have low OCR confidence, the upload result also shows
a temporary browser-only review list and can filter the visible rows to those
items. It is derived only from fixed parser issue codes, contains no source
text, and is cleared when the selection changes or the page is left; it is not
a stored review queue.

Before OCR begins, the reviewer can see generic page positions only, move a
selected image up or down, or remove it from the batch. This changes only the
browser-held selection: the opaque source reference remains with its selected
image and the final order becomes the OCR page numbering. File names are never
displayed. After OCR finishes for an image batch, the reviewer may explicitly
return to its browser-held photos to reorder or remove pages. This requires a
clear confirmation and deletes all OCR drafts, selected rows, route-code edits,
and page confirmations before OCR is run again; the photos remain local. PDF
pages remain in their original order and require a corrected PDF. An additional
camera shot may append to an existing local camera batch before OCR (up to 20
pages), but a new existing-image/PDF choice, a camera shot outside that local
batch, or any new source after OCR waits for explicit confirmation before
replacing browser-held work.

On a supported mobile browser, the same screen offers a camera-first,
direct-camera chooser. After a camera capture, the screen moves to the local
inspection step; an appended page opens its own inspection card. After checking
a sharp, straight, shadow-free table photo locally, the reviewer may press
**Save page and continue capturing** to append another photo to the browser-only
camera queue, up to 20 pages. Each
appended page receives a fresh opaque source reference; it does not replace a
prior page and none of the queued photos is uploaded until the reviewer
explicitly starts OCR. Each queued camera page can be opened for local metadata
advice and preview, or explicitly replaced before OCR without changing the
other pages or its opaque page reference. While an active camera photo or image
replacement is selected, the browser also reads its local image metadata and
gives an advisory result for media type, the same minimum dimensions, and the
same pixel limit as the server. Where the browser supports it and the source is
not unusually large, it also samples a small in-memory canvas for extreme
darkness, strong uneven lighting, or an unusually low amount of central image
detail. That optional check does not upload or persist the photo, inspect OCR
text, certify focus or OCR quality, or prevent the reviewer from requesting the
server check. A new capture that would replace the whole current selection
waits for explicit confirmation. The browser may offer a regular file chooser
instead of a camera, so camera availability is never assumed.

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
`/review`. Each selected page first needs its own explicit confirmation: a
short route code from `1` through `99` and the currently selected traceable
rows. An OCR suggestion is never itself an approval. Changing that page's
route, selected rows, or source image cancels the page confirmation; any
selected page still waiting for confirmation blocks the final transfer. The
transfer is held in session storage for at most 15 minutes and is removed as
soon as the review screen reads it. It carries an opaque, random document
reference, source page/row, product identifiers, the three OCR source
quantities for visual comparison, and the page's confirmed short numeric
route-code draft. It does not carry a filename, original image,
customer/header text, full OCR trace, or catalog result. When the reviewer
submits explicit manual quantities, that bounded route code can accompany the
same row only to produce a separate, non-persistent review breakdown. The API
canonicalizes `01` and `1` to one route. It never changes product resolution,
cases or units, city assignment, export, or the global total; direct manual
rows without a confirmed route remain in the global total only.

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
infers a pack size, or converts cases and units. A separate optional packing
suggestion action is available only for an OCR draft with three structured
source quantities. The reviewer may calculate those suggestions in sequence
for all currently eligible, blank OCR rows; that batch only displays an
available suggestion or a review reason for each row, never fills or submits a
quantity to manual review, and stops if a row is changed. Its three structured
source quantities are sent only to the packing-suggestion endpoint for that
calculation. It has no persistence or operational side effect and can fill
blank manual fields only after the reviewer explicitly presses **Apply
suggestion** for that row.

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

When an OCR-transferred row carried a page-confirmed route code, the result
also renders a separate **review summary by route**. Each route is re-evaluated
from the explicit manual rows, so its cases and units are never guessed from a
global aggregate. The grouped tables include only their own accepted rows;
accepted rows without a confirmed route are counted as unassigned and remain
in the global total only. This is not a city mapping, delivery assignment,
saved pick list, or export.

For every verified product total, the review result can expand two separate
source lists: one for cases and one for individual units. Each displayed entry
contains its page and printed row, plus a response-local document number only
when an OCR-transferred row needs to be distinguished from another document
with the same page/row. The result does not expose source text, file names,
opaque document references, or a quantity contribution per source; the current
Foundation contract retains source references but not an individual quantity
value for each reference.

After a successful manual review with at least one accepted row, the reviewer
may explicitly save a **browser-local result snapshot**. It is never created
automatically. The snapshot is available only from `/results` in the same
browser and device for up to 24 hours, and the reviewer can explicitly delete
it. At most ten snapshots are retained; a full local list requires an explicit
deletion before another result can be saved.

The saved snapshot is display-only. It contains only the catalog readiness
counts/version at the time of the review, verified product names and
barcode/SKU identifiers, separate case/unit totals, fixed warning/count
metadata, page/row source positions, and the already reviewed route breakdown.
It does not retain editable form rows, raw source/OCR text, OCR quantities or
confidence, images/PDFs, filenames, document headers/customer details, opaque
document references, server review IDs, or arbitrary API data. A saved result
can be downloaded locally as a UTF-8 CSV summary of verified product totals
only. The CSV contains SKU, barcode, product name, separate case totals, and
separate unit totals. It excludes source positions, routes, cities, customer
data, OCR text, images, and internal identifiers; it is not a pick list and
cannot be submitted again.

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
- It returns table-body fields (product identifiers, product name, the three
  source quantity columns, confidence, row bounds, and parser issues) and one
  tightly constrained page-level `routeDraft`. That draft can expose only a
  route code from `1` through `99` that is anchored to the fixed `קו חלוקה`
  label in the upper-right header area with sufficient OCR confidence. It never returns
  raw header text, customer details, or an unanchored number.
- Every displayed table field has its own OCR confidence. A low-confidence
  field becomes a non-persistent review issue with fixed UI guidance; it does
  not accept, reject, convert, or automatically transfer a quantity.
- On a high-resolution Maayan close-up, it may first use a numeric calibration
  pass. That pass requires at least four vertically aligned SKU candidates,
  one unambiguous barcode per accepted row, and all three source quantity
  values. It omits a row instead of guessing any missing value. After that
  calibration, it may scan only the bounded product-name column and assigns a
  returned name to just one nearby SKU row; no returned text, or a
  boundary-ambiguous word, remains blank with a review issue.
- It never returns the filename, document header, customer information, full
  OCR text, original image, catalog match, totals, or a pick list. The sole
  header exception is the bounded `routeDraft` code described above.
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

- Cases and units are explicit fields; a transferred OCR draft initially leaves
  both blank.
- A targeted numeric draft can have no readable printed source-row number. It
  remains visible for comparison, but it cannot be transferred automatically
  to manual review; enter that source row explicitly instead.
- Values are checked only for being finite and non-negative.
- It never splits collapsed OCR text or a single ambiguous number. A packing
  suggestion is considered only from the three separately structured source
  fields when all are positive integers and `totalUnits = caseQuantity ×
  unitsPerCase`.
- The active, versioned rule configuration permits a **review suggestion**,
  never an automatic conversion: `1/8`, `1/10`, `1/12`, `1/20`, `1/24`,
  `1/30`, and `1/36` are case-only markers; a number in parentheses from `8`
  through `24` is an individual-picking marker. Other `1/N` values, other
  parentheses, a missing marker, or more than one marker remain manual review.
- The verified catalog always overrides a source marker. The marker's pack size
  must equal the catalog `caseSize`; `1/N` must match a case-only catalog
  product and the source `unitsPerCase` must equal `N`; `(N)` must match an
  individual-picking product and the source `unitsPerCase` must be `1`.
- For an approved `(N)` suggestion, the structured `caseQuantity` value is
  treated as requested individual units and is split into `floor(quantity / N)`
  cases plus `quantity mod N` units. For an approved `1/N` suggestion, that
  value is retained as cases and the suggested units are zero. In both cases
  the reviewer must press **Apply suggestion**; existing manual values are
  never overwritten.
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
- `/settings` also performs a read-only structural readiness check for the
  bundled city and route configuration. It returns only versions, counts, and
  fixed readiness codes. The current catalogs are explicitly sample-only, so
  that notice cannot activate a selector, assign an order, or create a group.

## Unavailable capabilities

- Perspective correction, stored OCR jobs, and operational or automatic
  image/PDF-to-pick-list processing.
- The legacy `/api/process` endpoint is deliberately disabled. It returns a
  fixed, non-cacheable `501` response without parsing an uploaded request; it
  is not an alternative to `/api/intake/preflight`.
- Server-side or editable persisted jobs, a persistent review queue, XLSX/PDF/
  print files, export history, operational city/route exports, operational
  route grouping, and offline recovery. The only available export is the local
  CSV summary of a saved verified result. The explicit 24-hour local result
  snapshot is not a saved OCR job or a recoverable form draft. The settings page
  currently reports only city/route catalog readiness; the review-only route
  breakdown is not a city mapping or a delivery group.
- AI assistance.

Those capabilities must be rebuilt against the Foundation contracts and added
only with auditable tests and verified data.
