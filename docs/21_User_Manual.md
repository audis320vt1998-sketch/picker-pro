# 21 — User Manual

## 1. Introduction

**Picker Pro** turns photographs of paper order sheets into validated, printable pick lists. This manual covers the end-to-end workflow for warehouse managers and pickers.

## 2. Getting Started

### 2.1 Installing the App

1. Open your browser and navigate to the Picker Pro URL provided by your administrator.
2. On **iOS**: tap the Share button → **Add to Home Screen**.
3. On **Android**: tap the browser menu → **Install App** (or **Add to Home Screen**).
4. The Picker Pro icon will appear on your home screen.

### 2.2 First Launch

No login is required in v1.0. The home screen shows your recent jobs.

## 3. Creating a New Job

### 3.1 Camera Capture (Recommended on Mobile)

1. Tap **New Job** on the home screen.
2. Tap **Take Photo** — your device's rear camera opens.
3. Photograph each order sheet page clearly and squarely.
4. Tap **Add More** to photograph additional pages.
5. Optionally select a **City** and **Delivery Route** if known.
6. Tap **Submit**.

### 3.2 File Upload

1. Tap **New Job** → **Upload Files**.
2. Select one or more image files (JPEG, PNG, WEBP, HEIC) or a PDF.
3. Drag to reorder pages if needed.
4. Optionally select a City and Delivery Route.
5. Tap **Submit**.

### 3.3 Tips for Best Results

- Photograph pages on a flat, well-lit surface.
- Avoid shadows across the text.
- Keep the camera parallel to the page (avoid angled shots).
- Ensure all four corners of the page are visible.

## 4. Monitoring Progress

After submitting, you are taken to the **Results** page for your job.

- The **progress bar** shows OCR and processing stages.
- Processing typically completes in under 30 seconds for a 5-page job.
- You can navigate away and return; the job continues in the background.

## 5. Reviewing Results

### 5.1 Summary Cards

At the top of the Results page you will see:

| Card | Meaning |
|---|---|
| Products | Total number of unique products found |
| Total Cases | Sum of all case quantities |
| Total Units | Sum of all individual unit quantities |
| Flagged | Items requiring your review |

### 5.2 Results Table

The table is grouped by **City** → **Delivery Route** → **Product**.

| Column | Meaning |
|---|---|
| Product Key | Barcode or SKU |
| Product Name | Hebrew product name |
| Cases | Total case quantity |
| Units | Total individual unit quantity |
| Sources | Original page and row references |

### 5.3 Source Traceability

The **Sources** column shows codes like `p1r3, p2r7`. These mean:

- `p1r3` → page 1, row 3 of your scanned order sheets.

Tap a source code to view the original scanned region (if supported by your installation).

## 6. Handling Flagged Items

### 6.1 Opening the Review Queue

Tap the **Flagged** badge or the **Review** button to open the review queue.

### 6.2 Reviewing an Item

For each flagged item you will see:

- The original scanned text.
- The data the system extracted (product, quantity, unit type).
- The reason it was flagged.

Choose one of:

| Action | When to use |
|---|---|
| **Approve** | The extracted data is correct. |
| **Correct** | You can fix the extracted data (e.g. wrong quantity). |
| **Reject** | The row is invalid and should be excluded from the pick list. |

### 6.3 Completing the Review

Work through all items until the **Flagged** count reaches 0. You can export before completing the review, but the export will include a warning and pending items will be excluded.

## 7. Exporting Results

### 7.1 Per-City Export

Under each city group, tap:

- **Excel** — downloads an XLSX file for that city.
- **PDF** — downloads a PDF file for that city.
- **Print** — opens a print-ready view in your browser.

### 7.2 What the Export Contains

Each export includes:

- One section per delivery route.
- Product key, Hebrew product name, total cases, total units.
- Source references for every line item.

## 8. Offline Use

- If your connection drops, the **Offline** banner appears at the top of the screen.
- You can still review and navigate completed jobs.
- Uploads and new submissions are queued and sent automatically when connectivity is restored.

## 9. Frequently Asked Questions

**Q: Cases and units appear as separate columns — is that correct?**
A: Yes. Picker Pro always keeps cases and individual units separate. Never combine them manually.

**Q: A product appears on multiple pages — will it be counted correctly?**
A: Yes. Picker Pro automatically aggregates the same product across all pages.

**Q: I photographed the wrong page. Can I remove it?**
A: Currently you must submit a new job. Page removal after submission is planned for v1.x.

**Q: Can I use Picker Pro on a desktop computer?**
A: Yes. All features are available in a desktop browser. Camera capture requires a webcam.

## 10. Support

Contact your IT administrator for:

- Access issues.
- Catalog updates (new products, cities, or delivery routes).
- Data retention and privacy questions.
