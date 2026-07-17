# Maayan Document Profile

The supplied samples are Hebrew, right-to-left price-offer documents. The
active parser profile considers only the table body and does not retain header
customer information.

## Table order (right to left)

1. Printed row number
2. Product key / SKU
3. Product barcode
4. Product name
5. Tray barcode
6. Case quantity
7. Units per case
8. Total individual units

The last three values are captured as source fields. The intake parser does not
turn them into operational case/unit totals or split a value by pack size.

## OCR handling

- Barcodes and SKUs remain strings, including leading zeroes.
- Product names may wrap over a second line.
- Rows are anchored only when both the SKU and product barcode are present.
- Multiple numeric OCR tokens in one required field are marked ambiguous, not
  concatenated.
- Header, customer, and document-barcode text sit outside the configured table
  body and are not included in extracted row text.
- When the normal full-page OCR cannot establish the table, the runtime first
  scans a narrow numeric SKU area. It requires at least four vertically
  aligned SKU candidates near the expected column, then accepts only an
  unambiguous barcode and all three source quantities on each matching row.
- This numeric recovery uses an in-memory, English/digits-only OCR worker and
  never returns its full scan text. It may leave a product name or printed
  source-row number empty; those fields must be checked manually.
- A numeric recovery row is discarded if a barcode or quantity is missing or
  ambiguous. It never joins fragments, repairs digits, converts quantities, or
  creates a total.

## Preflight eligibility

- The first profile accepts a high-resolution close-up only (at least
  1200 by 1600 pixels). Full-page 720 by 1280 photos from the supplied set are
  intentionally returned as `IMAGE_TOO_LOW_RESOLUTION`.
- The x-column bands are normalized to the page width and the vertical table
  body is anchored to a same-line printed row number, SKU, and product barcode
  trio. This avoids a fixed page crop across the supplied close-ups. Small
  horizontal shifts are scored only by that same strict anchor trio, so an
  angled close-up can be calibrated without using customer/header text or
  quantity-only tokens as alignment evidence.
- The current endpoint is `/api/intake/preflight`. Its response is always
  `NEEDS_REVIEW`; it does not resolve a catalog or create pick totals.
- A user may explicitly confirm selected, traceable rows and pass a minimal
  draft to `/review` through one-time session storage. The draft excludes the
  image, filename, document/header OCR trace, and customer data. Its three
  source quantity fields are comparison-only; they are not copied into the
  manual `cases` or `units` inputs and are not part of the manual-review API
  request.

## OCR runtime

- The Hebrew and English OCR language models are cached outside the repository
  in a temporary directory by default. Set `PICKER_PRO_OCR_CACHE` to a
  writable, pre-provisioned cache directory for an offline or managed server.
- The first uncached OCR run can take longer while models initialize. The
  preflight endpoint permits one worker per Node process and returns a
  review-only timeout or busy response instead of starting parallel workers.
