# 02 — Business Requirements

## 1. Document Control

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Approved |
| Date | 2026-07-15 |
| Owner | Product |

## 2. Functional Requirements

### 2.1 Input Capture

| ID | Requirement |
|---|---|
| FR-IN-01 | The system SHALL accept image files (JPEG, PNG, WEBP, HEIC) as input. |
| FR-IN-02 | The system SHALL accept PDF files (single- and multi-page) as input. |
| FR-IN-03 | The system SHALL allow direct camera capture from a mobile browser via the PWA. |
| FR-IN-04 | The system SHALL allow uploading multiple images or PDF pages as a single job. |
| FR-IN-05 | The system SHALL preserve the original page order for traceability. |

### 2.2 OCR Processing

| ID | Requirement |
|---|---|
| FR-OCR-01 | The system SHALL extract text using a Hebrew-capable OCR engine. |
| FR-OCR-02 | The system SHALL apply a domain-specific OCR correction dictionary before parsing. |
| FR-OCR-03 | The system SHALL support both RTL (Hebrew) and LTR (numeric) text on the same page. |
| FR-OCR-04 | The system SHALL assign a confidence score to each extracted value. |
| FR-OCR-05 | Values below the confidence threshold SHALL be flagged for manual review. |

### 2.3 Product Resolution

| ID | Requirement |
|---|---|
| FR-PRD-01 | Products SHALL be resolved by barcode first, SKU second, normalised name third. |
| FR-PRD-02 | Product aliases SHALL be maintained in the product catalog. |
| FR-PRD-03 | Unresolved products SHALL be placed in the validation queue. |
| FR-PRD-04 | A product SHALL NOT be resolved by name alone when a barcode exists in the catalog. |

### 2.4 Quantity Rules

| ID | Requirement |
|---|---|
| FR-QTY-01 | Cases and individual units SHALL be tracked as separate totals. |
| FR-QTY-02 | Cases and units SHALL never be combined in any aggregate or export. |
| FR-QTY-03 | Products whose names contain `(6)`, `(8)`, `(9)`, `(12)`, `(18)`, or `(24)` MAY permit individual-unit picking as defined in the product rules. |
| FR-QTY-04 | Products whose names contain `1/8`, `1/12`, `1/20`, or `1/24` SHALL be treated as full-case only. |
| FR-QTY-05 | The system SHALL aggregate quantities for the same product key across all input pages. |

### 2.5 City and Delivery Route

| ID | Requirement |
|---|---|
| FR-CTY-01 | City and delivery route SHALL be separate, independently maintained fields. |
| FR-CTY-02 | Results SHALL be grouped first by city, then by delivery route within each city. |
| FR-CTY-03 | A delivery route SHALL belong to exactly one city. |
| FR-CTY-04 | The city and route catalogs SHALL be configurable without code changes. |

### 2.6 Validation and Review

| ID | Requirement |
|---|---|
| FR-VAL-01 | The system SHALL run all configured validation rules against parsed results. |
| FR-VAL-02 | Items failing validation SHALL enter a review queue and NOT appear in the final export. |
| FR-VAL-03 | Reviewers SHALL be able to accept, correct, or reject each queued item. |
| FR-VAL-04 | Manual overrides SHALL be logged with reviewer identity and timestamp. |

### 2.7 Traceability

| ID | Requirement |
|---|---|
| FR-TRC-01 | Every quantity in the final export SHALL carry a reference to its source page number and row. |
| FR-TRC-02 | Aggregated quantities SHALL list all contributing source references. |
| FR-TRC-03 | The system SHALL never replace a verified source value with a guess. |

### 2.8 Export

| ID | Requirement |
|---|---|
| FR-EXP-01 | The system SHALL export results as Excel (XLSX) per city. |
| FR-EXP-02 | The system SHALL export results as PDF per city. |
| FR-EXP-03 | The system SHALL provide a print view per city. |
| FR-EXP-04 | Exports SHALL include case totals and unit totals in separate columns. |
| FR-EXP-05 | Exports SHALL include traceability references for every line item. |

### 2.9 Offline Recovery

| ID | Requirement |
|---|---|
| FR-OFF-01 | The PWA SHALL cache active jobs in local storage. |
| FR-OFF-02 | A job interrupted by connectivity loss SHALL resume from its last checkpoint on reconnect. |
| FR-OFF-03 | The user SHALL receive a visible indicator when offline. |

### 2.10 Business Rules Management

| ID | Requirement |
|---|---|
| FR-RUL-01 | All business rules SHALL be defined in versioned configuration files. |
| FR-RUL-02 | Rule changes SHALL not require application code changes. |
| FR-RUL-03 | Each rule version SHALL carry a timestamp and author identifier. |

## 3. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | OCR accuracy for Hebrew numeric fields SHALL be ≥ 97 %. |
| NFR-02 | End-to-end processing per page SHALL complete in < 8 seconds on a mid-range device. |
| NFR-03 | The PWA SHALL be installable on iOS Safari 16+ and Android Chrome 112+. |
| NFR-04 | All API endpoints SHALL respond within 200 ms for non-processing requests. |
| NFR-05 | The system SHALL support concurrent processing of up to 10 jobs. |
| NFR-06 | All secrets SHALL be stored in environment variables; none SHALL be hard-coded. |
| NFR-07 | The application SHALL pass Next.js ESLint rules without errors. |
| NFR-08 | Test coverage for domain modules SHALL be ≥ 80 %. |

## 4. Constraints

- Technology stack: Next.js 14, TypeScript, React 18.
- Mobile delivery: installable PWA; native app (Capacitor) is a future option.
- No production application behaviour changes in the documentation task.
- Catalog updates are deployed as configuration, not code releases.

## 5. Assumptions

- Input order sheets are photographed under reasonable lighting conditions.
- Product barcodes are present in the catalog before processing begins.
- City and delivery-route catalogs are maintained by an IT administrator.
- Hebrew text appears in standard square-script (not cursive) on printed forms.
