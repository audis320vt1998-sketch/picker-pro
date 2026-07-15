# 16 — User Interface

## 1. Overview

The Picker Pro UI is a **Progressive Web App (PWA)** built with Next.js 14 App Router and React 18. It is designed for mobile-first use (warehouse pickers with smartphones) while remaining fully usable on desktop (warehouse managers reviewing and exporting results).

## 2. PWA Strategy

- The app is installable on iOS Safari 16+ and Android Chrome 112+ via `Add to Home Screen`.
- A Web App Manifest (`/public/manifest.json`) declares app name, icons, theme colour, and `display: standalone`.
- A service worker caches static assets and active job state for offline operation.
- Capacitor wrapper is a documented future option; no native code is included in v1.0.

## 3. Page Structure

### 3.1 Home (`/`)

- Lists recent jobs with status indicators.
- "New Job" button navigates to `/upload`.
- Offline indicator badge if connectivity is lost.

### 3.2 Upload (`/upload`)

- **Camera capture**: `<input type="file" accept="image/*" capture="environment">` — triggers rear camera on mobile.
- **File upload**: drag-and-drop or file picker for images and PDFs.
- **Multi-page support**: multiple files shown as a sortable list before submission.
- City and route selectors (optional overrides).
- "Submit" button posts to `/api/process`.

### 3.3 Results (`/results/[id]`)

- **Progress bar**: real-time job progress via polling.
- **Summary cards**: total products, total cases, total units, flagged items.
- **Results table**: grouped by city → route → product.
- **Review queue badge**: count of pending items; links to review modal.
- **Export buttons**: per-city XLSX, PDF, and print actions.

### 3.4 Review Modal

- Lists pending review queue items one at a time.
- Shows original scanned image region (if available) alongside the parsed data.
- Reviewer can approve, correct fields, or reject.
- Progress indicator: `N of M items reviewed`.

### 3.5 Settings (`/settings`)

- OCR confidence threshold slider.
- Default city and route selectors.
- Catalog version display (products, cities, routes, rules).
- Toggle for zero-quantity rows display.

## 4. Components

| Component | Path | Purpose |
|---|---|---|
| `UploadBox` | `components/UploadBox` | File / camera input with drag-and-drop |
| `ProgressBar` | `components/ProgressBar` | Job processing progress |
| `ResultsTable` | `components/ResultsTable` | Grouped results display |
| `SummaryCards` | `components/SummaryCards` | Key metric cards |
| `ReviewModal` | `components/ReviewModal` | Review queue UI |
| `ExportButtons` | `components/ExportButtons` | Per-city export actions |
| `OfflineBanner` | `components/OfflineBanner` | Connectivity status indicator |

## 5. Responsive Design

| Breakpoint | Layout |
|---|---|
| Mobile (< 640 px) | Single-column; camera button prominent; table scrolls horizontally |
| Tablet (640–1024 px) | Two-column cards; full table visible |
| Desktop (> 1024 px) | Sidebar navigation; full results dashboard |

## 6. RTL Support

- Hebrew text in results and product names is rendered with `dir="rtl"`.
- The overall UI layout remains LTR (quantities, buttons, navigation are left-to-right).
- Mixed RTL/LTR content uses Unicode bidi isolation (`<bdi>` elements or `unicode-bidi: isolate` CSS).

## 7. Accessibility

- All interactive elements have accessible labels.
- Focus management in modals follows WAI-ARIA practices.
- Colour contrast meets WCAG 2.1 AA.

## 8. Offline Behaviour

- When offline, the UI shows the `OfflineBanner`.
- Completed jobs are available from the local cache.
- Upload and processing actions are queued and retried on reconnect.
- Local job state is stored in IndexedDB via the service worker.
