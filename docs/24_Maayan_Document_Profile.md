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

## Preflight eligibility

- The first profile accepts a high-resolution close-up only (at least
  1200 by 1600 pixels). Full-page 720 by 1280 photos from the supplied set are
  intentionally returned as `IMAGE_TOO_LOW_RESOLUTION`.
- The x-column bands are normalized to the page width and the vertical table
  body is anchored to a same-line printed row number, SKU, and product barcode
  trio. This avoids a fixed page crop across the supplied close-ups.
- The current endpoint is `/api/intake/preflight`. Its response is always
  `NEEDS_REVIEW`; it does not resolve a catalog or create pick totals.

## OCR runtime

- The Hebrew and English OCR language models are cached outside the repository
  in a temporary directory by default. Set `PICKER_PRO_OCR_CACHE` to a
  writable, pre-provisioned cache directory for an offline or managed server.
- The first uncached OCR run can take longer while models initialize. The
  preflight endpoint permits one worker per Node process and returns a
  review-only timeout or busy response instead of starting parallel workers.
