# 05 — OCR Engine

## 1. Overview

The OCR Engine (`lib/ocr/`) extracts text from camera images, uploaded image files, and PDF pages. It uses **Tesseract.js** with Hebrew and English language packs and applies dictionary-based correction before emitting structured results.

## 2. Supported Input Formats

| Format | Notes |
|---|---|
| JPEG | Camera capture and file upload |
| PNG | File upload |
| WEBP | Modern camera formats |
| HEIC | iOS camera output (converted server-side) |
| PDF | Each page rendered to image before OCR |

## 3. Processing Pipeline

```
Input Buffer
     │
     ▼
 Pre-processing
 (deskew, denoise, binarise)
     │
     ▼
 Tesseract.js
 (heb+eng, PSM 6)
     │
     ▼
 OcrLine extraction
 (text, confidence, bbox)
     │
     ▼
 Dictionary correction
 (catalogs/ocr_dictionary.json)
     │
     ▼
 OcrResult emission
```

## 4. Tesseract Configuration

| Parameter | Value | Reason |
|---|---|---|
| Language | `heb+eng` | Hebrew product names + numeric values |
| Page Segmentation Mode | PSM 6 (uniform block of text) | Order sheets have tabular structure |
| OEM | LSTM | Highest accuracy |
| Confidence threshold | 70 % | Values below are flagged for review |

## 5. OCR Dictionary

The file `catalogs/ocr_dictionary.json` contains common OCR misreads for Hebrew product names and numeric patterns. The engine applies these substitutions after raw OCR and before parsing.

Structure:
```json
{
  "version": "1.0.0",
  "entries": [
    { "misread": "0", "correction": "O", "context": "hebrew_letter" },
    { "misread": "מל", "correction": "מ\"ל", "context": "unit_ml" }
  ]
}
```

## 6. Data Contracts

### OcrResult

```typescript
interface OcrResult {
  jobId: string;
  page: number;
  imageRef: string;
  lines: OcrLine[];
  processedAt: string; // ISO 8601
}

interface OcrLine {
  row: number;
  text: string;
  confidence: number; // 0–100
  bbox: BoundingBox;
}

interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
```

## 7. Error Handling

| Condition | Behaviour |
|---|---|
| Image unreadable | Job fails with `OCR_IMAGE_ERROR`; user notified |
| All lines below threshold | Page flagged; all rows enter review queue |
| PDF render failure | Job fails with `PDF_RENDER_ERROR` |
| Dictionary file missing | Warning logged; processing continues without correction |

## 8. Performance Targets

- Single A4 page: < 5 seconds on a 2 vCPU server instance.
- Parallel page processing supported via worker threads.

## 9. Future Enhancements

- Cloud OCR fallback (Google Vision / AWS Textract) for difficult images.
- On-device OCR via WebAssembly build of Tesseract for fully offline operation.
