# Changelog

All notable changes to Picker Pro are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Picker Pro uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- A read-only GitHub Actions quality gate for tests, lint, type checking, and
  the production build on Node.js 24.
- Browser-local OCR page-review progress and next-attention navigation.
- A page-local bulk selection control for currently visible, transferable OCR
  rows; it preserves hidden or blocked rows and still requires page
  confirmation before handoff.
- Automatic browser-local preview opening for each accepted camera capture,
  so framing and readability can be inspected before OCR without upload.
- An advisory browser-local camera-quality check for extreme darkness, strong
  uneven light, and unusually low detail, limited to the active photo and
  never sent to the server.
- Complete documentation suite under `docs/` (22 documents).
- Reference catalogs under `catalogs/` (products, cities, delivery routes, rules, OCR dictionary).
- Updated `README.md` with full project overview, core business rules, and documentation index.

### Changed
- Upgraded the active application to Next.js 16.3, React 19.2, and the ESLint
  flat configuration, including asynchronous route parameters and Turbopack
  production builds.

### Security
- Replaced the vulnerable Next.js 14/PostCSS dependency line and made the
  production `npm audit` check block high and critical findings in CI.

---

## [0.1.0] — 2026-07-15

### Added
- Initial Next.js 14 / TypeScript project scaffold.
- Domain module structure under `lib/` (ocr, parser, rules, calculator, aggregator, export, catalog, engine, ai, database).
- API routes: `/api/health`, `/api/process`, `/api/ai`.
- React components: `UploadBox`, `ResultsTable`, `SummaryCards`, `ProgressBar`.
- App pages: `/upload`, `/results`, `/settings`.
- Tesseract.js integration for OCR.
- OpenAI API integration for AI-assisted OCR correction.
- CodeQL analysis workflow.
- Initial Software Design Specification (`docs/picker-pro-software-design-specification.md`).

---

[Unreleased]: https://github.com/audis320vt1998-sketch/picker-pro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/audis320vt1998-sketch/picker-pro/releases/tag/v0.1.0
