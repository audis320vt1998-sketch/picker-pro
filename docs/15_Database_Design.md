# 15 — Database Design

## 1. Overview

Picker Pro uses **PostgreSQL** as its primary data store, accessed through the abstraction layer in `lib/database/`. The schema stores jobs, pages, parsed rows, resolved products, aggregated results, review queue items, and export records.

## 2. Entity-Relationship Summary

```
jobs
 ├── pages (job_id FK)
 │    └── parsed_rows (page_id FK)
 │         └── resolved_products (row_id FK)
 ├── aggregated_results (job_id FK)
 │    └── source_refs (result_id FK)
 ├── review_queue_items (job_id FK)
 ├── city_groups (job_id FK)
 │    └── route_groups (city_group_id FK)
 └── export_records (job_id FK)
```

## 3. Table Definitions

### 3.1 `jobs`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Job identifier |
| `status` | VARCHAR(32) | `PENDING`, `PROCESSING`, `VALIDATED`, `PARTIAL`, `COMPLETE`, `FAILED` |
| `created_at` | TIMESTAMPTZ | Job creation time |
| `updated_at` | TIMESTAMPTZ | Last status change |
| `rules_version` | VARCHAR(16) | Rule set version active at job creation |
| `created_by` | VARCHAR(255) | User identifier |

### 3.2 `pages`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Page identifier |
| `job_id` | UUID FK → jobs | Parent job |
| `page_number` | INTEGER | 1-based page order |
| `image_ref` | VARCHAR(512) | Storage path / URL of original image |
| `ocr_processed_at` | TIMESTAMPTZ | When OCR completed |

### 3.3 `parsed_rows`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Row identifier |
| `page_id` | UUID FK → pages | Parent page |
| `row_number` | INTEGER | Row position on page |
| `raw_text` | TEXT | Original OCR text |
| `product_hint` | TEXT | Extracted product name/hint |
| `barcode` | VARCHAR(64) | Extracted barcode |
| `sku` | VARCHAR(64) | Extracted SKU |
| `quantity` | NUMERIC(10,3) | Extracted quantity |
| `unit` | VARCHAR(8) | `case` or `unit` |
| `confidence` | NUMERIC(5,2) | OCR confidence (0–100) |

### 3.4 `resolved_products`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `row_id` | UUID FK → parsed_rows | |
| `product_key` | VARCHAR(64) | Canonical product key |
| `resolved_by` | VARCHAR(16) | `barcode`, `sku`, `name`, `alias` |
| `rule_status` | VARCHAR(8) | `pass`, `warn`, `fail` |

### 3.5 `aggregated_results`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `job_id` | UUID FK → jobs | |
| `product_key` | VARCHAR(64) | Canonical product key |
| `total_cases` | NUMERIC(10,3) | Aggregated case total |
| `total_units` | NUMERIC(10,3) | Aggregated unit total |

### 3.6 `source_refs`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `result_id` | UUID FK → aggregated_results | |
| `page_number` | INTEGER | |
| `row_number` | INTEGER | |
| `unit` | VARCHAR(8) | |
| `quantity` | NUMERIC(10,3) | |

### 3.7 `review_queue_items`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Item identifier |
| `job_id` | UUID FK → jobs | |
| `stage` | VARCHAR(16) | `row` or `aggregate` |
| `severity` | VARCHAR(8) | `warn` or `fail` |
| `status` | VARCHAR(16) | `pending`, `approved`, `corrected`, `rejected` |
| `failed_rules` | TEXT[] | Rule IDs that failed |
| `correction` | JSONB | Reviewer-supplied correction data |
| `reviewed_by` | VARCHAR(255) | Reviewer identifier |
| `reviewed_at` | TIMESTAMPTZ | |

### 3.8 `export_records`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `job_id` | UUID FK → jobs | |
| `city_id` | VARCHAR(16) | |
| `format` | VARCHAR(8) | `xlsx`, `pdf`, `print` |
| `generated_at` | TIMESTAMPTZ | |
| `file_path` | VARCHAR(512) | |
| `line_count` | INTEGER | |

## 4. Indexes

| Table | Index | Columns |
|---|---|---|
| `parsed_rows` | `idx_parsed_rows_page_id` | `page_id` |
| `aggregated_results` | `idx_agg_results_job_product` | `(job_id, product_key)` |
| `source_refs` | `idx_source_refs_result_id` | `result_id` |
| `review_queue_items` | `idx_review_job_status` | `(job_id, status)` |

## 5. Migrations

Database migrations are managed through the `lib/database/` migration module. Each migration is a numbered SQL file. Migrations run automatically on application startup in development; in production they require an explicit `npm run migrate` command.

## 6. Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | Connection pool size (default: 10) |
