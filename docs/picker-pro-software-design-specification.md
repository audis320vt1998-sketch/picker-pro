# Picker Pro Software Design Specification (SDS)

## 1. Document Control
- **Product**: Picker Pro
- **Version**: 0.1 (Initial Draft)
- **Prepared By**: Engineering
- **Date**: 2026-07-15

## 2. Purpose
This Software Design Specification defines the initial design for Picker Pro, a Next.js-based application for OCR-driven product data extraction, correction, processing, and result presentation.

## 3. Scope
Picker Pro supports:
- Uploading input files/images for OCR processing
- Extracting and parsing text data
- Applying correction and calculation logic
- Presenting processed results in the UI
- Exposing API routes for health checks, processing, and AI-assisted workflows

## 4. System Context
Picker Pro is a web application built with Next.js (App Router), React, and TypeScript. It integrates OCR and OpenAI-based AI services, and includes domain modules for parsing, rules, aggregation, and export.

## 5. High-Level Architecture
- **Frontend Layer**: Next.js pages in `app/` with React components in `components/`
- **API Layer**: Route handlers in `app/api/`
- **Domain/Service Layer**: Reusable business logic in `lib/`
- **Configuration Layer**: Runtime behaviour via environment variables in `.env.local`

Data flow (simplified):
1. User uploads input in the UI
2. API endpoint triggers OCR and processing pipeline
3. Parser/rules/calculation modules transform extracted data
4. Results are stored/retrieved through database abstraction
5. UI renders result summaries and tables

## 6. Module Design

### 6.1 App Routes (`app/`)
- `app/page.tsx`: landing/home experience
- `app/upload/`: upload workflows
- `app/results/`: processed results views
- `app/settings/`: runtime/configuration views
- `app/api/`: server-side endpoints

### 6.2 API Routes (`app/api/`)
- `app/api/health/route.ts`: service health endpoint
- `app/api/process/route.ts`: processing orchestration endpoint
- `app/api/ai/route.ts`: AI chat endpoint backed by OpenAI

### 6.3 AI Services (`lib/ai/`)
- `chatgpt.ts`: ChatGPT integration with tool-calling loop (read/write results via function calling)
- `corrector.ts`: OCR text correction entry points
- `fuzzy.ts`: fuzzy matching and similarity helpers (Levenshtein + Jaro-Winkler)

### 6.4 Domain Libraries (`lib/`)
- `ocr/`: OCR extraction logic (powered by Tesseract.js)
- `parser/`: parsing structured values from extracted text
- `calculator/`: business calculations and totals
- `rules/`: validation and business rules
- `aggregator/`: aggregation/composition of outputs
- `export/`: export formatting and delivery
- `database/`: persistence abstraction
- `catalog/`, `engine/`: supporting domain workflows

## 7. Data Design
- **Input Data**: image/document payloads and metadata
- **Intermediate Data**: extracted OCR text and corrected values
- **Output Data**: normalised product/result records suitable for display/export
- **Persistent Data**: processing results accessed through `lib/database`

## 8. External Interfaces

### 8.1 User Interface
- Upload and progress components
- Summary/result visualisation components
- Configuration pages for application behaviour

### 8.2 API Interface
- JSON request/response model for all API routes
- Health endpoint for readiness checks
- AI endpoint requiring `OPENAI_API_KEY`

### 8.3 Third-Party Services
- **OpenAI API** (`openai` npm package) — AI-assisted processing and chat
- **Tesseract.js** (`tesseract.js` npm package) — client/server-side OCR
- **Database** — PostgreSQL (or compatible) configured via `DATABASE_URL`

## 9. Security and Compliance Considerations
- All secrets (API keys, database credentials) are provided via environment variables; never hard-coded
- Input validation is required for all API payloads
- Error responses must not leak sensitive internals

## 10. Non-Functional Requirements
- **Availability**: health endpoint supports external monitoring/uptime checks
- **Performance**: asynchronous processing pipeline for OCR and AI tasks
- **Maintainability**: modular service organisation under `lib/`
- **Scalability**: API-layer separation enables future worker/background scaling

## 11. Build, Test, and Quality Gates
Available scripts:
| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint code quality |
| `npm test` | Jest test suite |

## 12. Assumptions and Open Items
1. Complete missing module implementations/import paths required for successful production build
2. Add ESLint configuration file to make lint non-interactive in CI
3. Define formal data schemas for processing result entities
4. Establish automated tests for core processing modules and API routes

## 13. Revision History
| Version | Date | Description |
|---|---|---|
| 0.1 | 2026-07-15 | Initial SDS draft created |
