# 12 — Delivery Route Engine

## 1. Overview

The Delivery Route Engine (part of `lib/catalog/`) sub-groups each `CityGroup` by delivery route, using `catalogs/delivery_routes.json`. A delivery route belongs to exactly one city; the engine enforces this constraint at load time.

## 2. Route Assignment

Route assignment follows the same priority as city assignment:

1. **Explicit route field** — route identifier extracted from the order sheet.
2. **Job-level route override** — user selected a route at job submission.
3. **Unassigned route** — falls into the city's `UNASSIGNED_ROUTE` group.

## 3. Processing Flow

```
CityGroup[]  (from City Engine)
        │
        ▼
  For each CityGroup:
    For each AggregatedResult:
      Lookup routeId in catalogs/delivery_routes.json
      (filtered by cityId)
        │
        ├─ found  ──▶ assign to RouteGroup
        │
        └─ not found ──▶ assign to UNASSIGNED_ROUTE
        │
        ▼
  Attach RouteGroup[] to CityGroup
```

## 4. Data Contracts

```typescript
interface RouteGroup {
  routeId: string;
  routeName: string;
  cityId: string;
  products: AggregatedResult[];
  sortOrder: number;
}
```

## 5. Delivery Route Catalog Format

```json
{
  "version": "1.0.0",
  "routes": [
    {
      "routeId": "TLV-N",
      "cityId": "TLV",
      "name": "תל אביב צפון",
      "nameEn": "Tel Aviv North",
      "sortOrder": 1,
      "active": true
    },
    {
      "routeId": "TLV-S",
      "cityId": "TLV",
      "name": "תל אביב דרום",
      "nameEn": "Tel Aviv South",
      "sortOrder": 2,
      "active": true
    }
  ]
}
```

## 6. City-Route Integrity

- At catalog load time, the engine verifies that each `routeId` maps to exactly one `cityId`.
- If a route references a non-existent city, a `ROUTE_CITY_MISMATCH` warning is logged and the route is deactivated.

## 7. Configuration

- Routes are managed exclusively through `catalogs/delivery_routes.json`.
- Adding or deactivating a route does not require code changes.
- `sortOrder` controls the display order within a city in the export.

## 8. Error Handling

| Condition | Behaviour |
|---|---|
| Route catalog missing | Engine throws `ROUTE_CATALOG_MISSING`; job fails |
| Route `cityId` does not match the CityGroup | Route disabled; warning logged |
| Route not found for a product | Product assigned to `UNASSIGNED_ROUTE` |
