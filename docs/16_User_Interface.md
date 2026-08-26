# 16 — User Interface

## 1. Overview

Picker Pro is a Hebrew right-to-left, mobile-first browser application built
with Next.js 16 App Router and React 19. Its active workflow is review-first:
the browser creates temporary OCR drafts at `/upload`, and a reviewer checks
and explicitly transfers selected rows to the manual-review screen at `/review`.

The product is not an offline warehouse application. The current, authoritative
scope is documented in [Current Status](./00_Current_Status.md).

## 2. Home-screen installation

- `app/manifest.ts` supplies the app name, Hebrew direction, standalone display
  mode, theme colors, and PNG install icons at 192px and 512px.
- `app/icon.tsx` and `app/apple-icon.tsx` generate the browser and Apple
  home-screen icons from the same Picker Pro mark.
- An install guidance card is available on `/` and `/upload` when relevant to
  the current browser or device. It offers a custom install button only after a
  supporting browser actually exposes its install prompt. On iPhone and iPad it
  explains **Share → Add to Home Screen**; on other mobile browsers it gives a
  menu fallback.
- Installation is an online-only launch convenience. There is no service worker,
  offline cache, background synchronization, offline OCR queue, or editable
  OCR-draft recovery. OCR still needs a network connection.
- Deploy over HTTPS before testing installation on a real device. Browser
  installation and custom-prompt availability vary by browser and platform.

## 3. Active pages

### 3.1 Home (`/`)

- Links to manual review, OCR upload, saved results, and settings.
- Shows mobile installation guidance only when it is relevant to the device or
  browser.

### 3.2 OCR upload (`/upload`)

- Offers a camera-first chooser on supported mobile browsers, image-batch
  selection, and a one-PDF workflow.
- Keeps up to 20 selected images in browser memory only. A camera capture opens
  its local preview automatically for framing/readability inspection.
- Performs local metadata and optional conservative lighting/detail advice;
  these checks do not upload, persist, or approve an image.
- Sends a page to OCR only after an explicit user action, then presents a
  review-required draft. It never creates a stored OCR job or queue.
- Lets the reviewer select traceable rows, enter a page-only route code from 1
  through 99, and explicitly confirm the page before one-time handoff.

### 3.3 Manual review (`/review`)

- Presents separate, explicit case and individual-unit fields.
- Resolves products through the verified catalog and produces a review result;
  no OCR quantity is copied into a manual field automatically.
- May show a packing suggestion only after an explicit request and application.

### 3.4 Results (`/results`)

- Displays browser-local, explicitly saved verified-result snapshots.
- Allows a local CSV summary download of verified product totals only.
- Does not retain source images, OCR text, editable form rows, or an export
  history.

### 3.5 Settings (`/settings`)

- Shows read-only catalog readiness information.
- Does not expose editable city/route selection or operational configuration.

## 4. Primary components

| Component | Path | Purpose |
|---|---|---|
| `DocumentPreflightWorkspace` | `components/DocumentPreflightWorkspace` | Camera/image/PDF OCR preflight and explicit page review |
| `ManualReviewWorkspace` | `components/ManualReviewWorkspace` | Explicit manual case/unit review and result submission |
| `SavedReviewResultsWorkspace` | `components/SavedReviewResultsWorkspace` | Browser-local verified snapshots and safe CSV download |
| `InstallPickerPro` | `components/InstallPickerPro` | Browser-specific, online-only home-screen installation guidance |

## 5. Responsive and accessible behavior

- The root document is `lang="he" dir="rtl"`; mixed identifiers and numeric
  values retain their natural direction where needed.
- On narrow screens, OCR table rows reflow into labeled cards with touch-sized
  transfer and page-review controls.
- Camera capture opens a single, local source preview with a bounded height so
  the reviewer can inspect the full photographed page without uploading it.
- OCR outcome navigation moves focus to the active page; explicit confirmation
  remains required before a row can be handed to manual review.
- Installation guidance uses ordinary buttons, details/summary controls, and
  live status text only for the result of an install action.

## 6. Offline behavior

The active application does not implement offline processing or recovery.
Without a connection, server OCR cannot run. The browser holds the current
camera/image selection only while the relevant upload flow remains active; it
is not a persisted job. An explicitly saved verified-result snapshot is a
separate display-only local feature and is not an OCR draft, image cache, or
offline queue. The one-time `/upload` to `/review` handoff may use short-lived
session storage, but it is removed after reading or expiry and is not draft
recovery.
