# 11 — City Engine

## 1. Overview

The City Engine (part of `lib/catalog/`) groups `AggregatedResult` records by city. City assignments are looked up from `catalogs/cities.json`. Results that cannot be assigned to a city are placed in a default "Unassigned" group and flagged for review.

## 2. City Assignment

City assignment is determined in the following order:

1. **Explicit city field** — if the order sheet contains a city identifier (name or code) extracted by the Parser Engine.
2. **Delivery route → city mapping** — if the order sheet contains a route identifier, the city is derived from `catalogs/delivery_routes.json`.
3. **Job-level city override** — if the user selected a city at job submission time.
4. **Unassigned** — if none of the above apply.

## 3. Processing Flow

```
AggregatedResult[]  +  CityContext (from job metadata)
        │
        ▼
  Lookup cityId in catalogs/cities.json
        │
        ├─ found  ──▶ assign to CityGroup
        │
        └─ not found ──▶ assign to 'UNASSIGNED' CityGroup + flag
        │
        ▼
  Emit CityGroup[]
```

## 4. Data Contracts

```typescript
interface CityGroup {
  jobId: string;
  cityId: string;
  cityName: string;
  products: AggregatedResult[];
  routes: RouteGroup[];          // populated by Delivery Route Engine
  hasUnassigned: boolean;
}
```

## 5. City Catalog Format

```json
{
  "version": "1.0.0",
  "cities": [
    {
      "cityId": "TLV",
      "name": "תל אביב",
      "nameEn": "Tel Aviv",
      "active": true
    },
    {
      "cityId": "JLM",
      "name": "ירושלים",
      "nameEn": "Jerusalem",
      "active": true
    }
  ]
}
```

## 6. Configuration

- Cities are managed exclusively through `catalogs/cities.json`.
- Adding or deactivating a city does not require code changes.
- Inactive cities (`"active": false`) are excluded from grouping and exports.

## 7. Error Handling

| Condition | Behaviour |
|---|---|
| City catalog missing | Engine throws `CITY_CATALOG_MISSING`; job fails |
| City not found in catalog | Record assigned to `UNASSIGNED` group; warning logged |
| Conflicting city assignments for the same job | User is prompted to confirm the correct city |
