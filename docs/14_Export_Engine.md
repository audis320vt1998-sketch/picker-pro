# 14 — Export Engine

## 1. Overview

The Export Engine (`lib/export/`) generates pick-list outputs from validated, aggregated, and grouped results. It produces three output formats — **Excel (XLSX)**, **PDF**, and **print-ready HTML** — each scoped to a single city. Every exported line item includes traceability references.

## 2. Export Formats

### 2.1 Excel (XLSX)

- One workbook per city.
- One worksheet per delivery route (sheet name = route name).
- One additional "Summary" worksheet with city totals.
- Column layout:

| # | Column | Description |
|---|---|---|
| A | Product Key | Barcode or SKU |
| B | Product Name | Canonical Hebrew name |
| C | Total Cases | Aggregate case count |
| D | Total Units | Aggregate unit count |
| E | Sources | Page + row references (comma-separated) |
| F | Notes | Reviewer corrections or flags |

### 2.2 PDF

- One PDF file per city.
- Sections separated by delivery route.
- Header: city name, export timestamp, job ID.
- Footer: page number, "Confidential".
- Table layout matches the XLSX column structure.
- Hebrew text is rendered RTL using a supported Hebrew PDF font.

### 2.3 Print View (HTML)

- Server-rendered HTML page at `/api/jobs/[id]/export?format=print&cityId=TLV`.
- Uses `@media print` CSS for clean printing.
- Includes a print button in the non-print view.
- Layout mirrors the PDF structure.

## 3. Export Trigger

```
GET /api/jobs/[id]/export
Query params:
  format  = 'xlsx' | 'pdf' | 'print'
  cityId  = <city ID from catalog>

Response:
  xlsx/pdf → file download
  print    → HTML page
```

## 4. Pre-export Checks

Before generating the output, the Export Engine:

1. Verifies that `pendingCount` in the review queue is 0 (or user has explicitly confirmed export with pending items).
2. Verifies that the job status is `VALIDATED` or `PARTIAL` (with user confirmation).
3. Confirms the requested `cityId` exists in the grouped results.

## 5. Traceability in Exports

Each line item in every export format includes a "Sources" field containing references in the format `p{page}r{row}` (e.g. `p1r3, p2r7`). Users can cross-reference these codes against the original scanned images stored in the job.

## 6. Data Contract

```typescript
interface ExportRequest {
  jobId: string;
  format: 'xlsx' | 'pdf' | 'print';
  cityId: string;
  includeUnassigned?: boolean;
}

interface ExportResult {
  jobId: string;
  cityId: string;
  format: 'xlsx' | 'pdf' | 'print';
  generatedAt: string;  // ISO 8601
  filePath?: string;    // for xlsx/pdf downloads
  html?: string;        // for print format
  lineCount: number;
  pendingCount: number; // items still awaiting review
}
```

## 7. Configuration

| Setting | Default | Description |
|---|---|---|
| `export.includeSourceRefs` | `true` | Whether source refs are included in exports |
| `export.pdfFont` | `NotoSansHebrew` | Font used for Hebrew PDF rendering |
| `export.xlsxSheetMaxRows` | `10000` | Split into multiple sheets if exceeded |

## 8. Error Handling

| Condition | Behaviour |
|---|---|
| Job not found | `404` response |
| City not in grouped results | `400` response with available city IDs |
| PDF font missing | Export fails with `PDF_FONT_ERROR` |
| XLSX library error | Export fails; error logged; user notified |
