# Picker Pro

**Picker Pro** is an OCR-powered, Hebrew-aware order-picking and product-aggregation platform built with **Next.js 14** and **TypeScript**. It digitises physical order sheets, aggregates quantities by product key (barcode → SKU → normalised name), and exports results per city and delivery route.

## Core Business Rules

1. Aggregate repeated products across all pages by product key (barcode → SKU → normalised name).
2. Keep **cases** and **individual units** as separate totals — never combine them.
3. Product names containing `(6)`, `(8)`, `(9)`, `(12)`, `(18)`, `(24)` allow individual-unit picking according to product rules.
4. Product names containing `1/8`, `1/12`, `1/20`, `1/24` are **full-case only**.
5. Barcode is the highest-priority identifier; then SKU; then normalised name and aliases.
6. City and delivery route are separate fields — group first by city, then by delivery route.
7. Every reported number must be traceable to its original page and source row.
8. Never guess when verified data exists.
9. All business rules are versioned and configurable.
10. Product catalog rules (`caseOnly`, `allowUnitPicking`) override name-based heuristics (rules 3–4) when a catalog entry is resolved.

## Features

| Feature | Details |
|---|---|
| Hebrew OCR | Tesseract.js with Hebrew (`heb`) language pack |
| Input methods | Direct phone-camera capture · image upload · PDF upload |
| Mobile experience | Installable PWA (future Capacitor wrapper option) |
| Offline recovery | Job state persisted locally; resumed on reconnect |
| Validation & review | Rule-based validation queue with manual override |
| Export | Excel (XLSX) · PDF · Print view — all scoped per city |
| Traceability | Every value linked to original page + row |

## Project Structure

```
picker-pro/
├── app/                    # Next.js App Router
│   ├── upload/             # Camera / file upload workflows
│   ├── results/            # Processed results views
│   ├── settings/           # Runtime configuration
│   └── api/                # Server-side API routes
├── components/             # Reusable React components
├── lib/                    # Domain service modules
│   ├── ocr/                # Hebrew OCR extraction (Tesseract.js)
│   ├── parser/             # Structured-value parser
│   ├── rules/              # Versioned business-rules engine
│   ├── aggregator/         # Cross-page product aggregation
│   ├── calculator/         # Case/unit calculation engine
│   ├── export/             # XLSX / PDF / print export
│   ├── catalog/            # Product / city / route catalogs
│   ├── engine/             # Orchestration engines
│   ├── ai/                 # OpenAI-assisted OCR correction
│   └── database/           # Persistence abstraction
├── catalogs/               # JSON reference catalogs
│   ├── products.json
│   ├── cities.json
│   ├── delivery_routes.json
│   ├── rules.json
│   └── ocr_dictionary.json
├── docs/                   # Full documentation suite
├── data/                   # Static seed data
└── [config files]
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/audis320vt1998-sketch/picker-pro.git
cd picker-pro
npm install
cp .env.example .env.local
npm run dev
```

The development server starts at `http://localhost:3000`.

## Available Scripts

```bash
npm run dev     # Development server with hot-reload
npm run build   # Production build
npm start       # Start production server
npm run lint    # ESLint via Next.js
npm test        # Jest test suite
```

## Documentation

See the [`docs/`](./docs/) directory for the full documentation suite:

| # | Document |
|---|---|
| 01 | [Executive Summary](./docs/01_Executive_Summary.md) |
| 02 | [Business Requirements](./docs/02_Business_Requirements.md) |
| 03 | [Software Design Specification](./docs/03_Software_Design_Specification.md) |
| 04 | [System Architecture](./docs/04_System_Architecture.md) |
| 05 | [OCR Engine](./docs/05_OCR_Engine.md) |
| 06 | [Parser Engine](./docs/06_Parser_Engine.md) |
| 07 | [Product Engine](./docs/07_Product_Engine.md) |
| 08 | [Rules Engine](./docs/08_Rules_Engine.md) |
| 09 | [Calculator Engine](./docs/09_Calculator_Engine.md) |
| 10 | [Aggregator Engine](./docs/10_Aggregator_Engine.md) |
| 11 | [City Engine](./docs/11_City_Engine.md) |
| 12 | [Delivery Route Engine](./docs/12_Delivery_Route_Engine.md) |
| 13 | [Validation Engine](./docs/13_Validation_Engine.md) |
| 14 | [Export Engine](./docs/14_Export_Engine.md) |
| 15 | [Database Design](./docs/15_Database_Design.md) |
| 16 | [User Interface](./docs/16_User_Interface.md) |
| 17 | [Testing](./docs/17_Testing.md) |
| 18 | [Deployment](./docs/18_Deployment.md) |
| 19 | [Security](./docs/19_Security.md) |
| 20 | [Developer Guide](./docs/20_Developer_Guide.md) |
| 21 | [User Manual](./docs/21_User_Manual.md) |
| 22 | [Roadmap](./docs/22_Roadmap.md) |

Reference catalogs are in [`catalogs/`](./catalogs/).

## Environment Variables

See [`.env.example`](./.env.example) for all required variables.

## License

MIT

## Author

[audis320vt1998-sketch](https://github.com/audis320vt1998-sketch)