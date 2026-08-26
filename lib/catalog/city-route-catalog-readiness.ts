import cityCatalogDocument from '@/catalogs/cities.json'
import routeCatalogDocument from '@/catalogs/delivery_routes.json'

export type CityRouteCatalogReadinessIssueCode =
  | 'CITY_CATALOG_INVALID'
  | 'ROUTE_CATALOG_INVALID'
  | 'CITY_CATALOG_SAMPLE_ONLY'
  | 'ROUTE_CATALOG_SAMPLE_ONLY'
  | 'DUPLICATE_CITY_ID'
  | 'DUPLICATE_ROUTE_ID'
  | 'ROUTE_CITY_CONFLICT'
  | 'ROUTE_CITY_UNKNOWN'
  | 'ROUTE_CITY_INACTIVE'
  | 'NO_ACTIVE_CITIES'
  | 'NO_ACTIVE_ROUTES'

export interface CityRouteCatalogReadiness {
  cityCatalogVersion: string | null
  routeCatalogVersion: string | null
  totalCities: number
  activeCities: number
  totalRoutes: number
  activeRoutes: number
  isReady: boolean
  issues: readonly CityRouteCatalogReadinessIssueCode[]
}

interface CityRecord {
  cityId: string
  active: boolean
}

interface RouteRecord {
  routeId: string
  cityId: string
  active: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function catalogVersion(document: unknown): string | null {
  return isRecord(document) && nonEmptyString(document.version)
    ? document.version.trim()
    : null
}

function isSampleOnly(document: unknown): boolean {
  return (
    isRecord(document) &&
    typeof document._status === 'string' &&
    /sample-only/i.test(document._status)
  )
}

function parseCity(value: unknown): CityRecord | null {
  if (!isRecord(value) || !nonEmptyString(value.cityId) || !nonEmptyString(value.name)) {
    return null
  }

  if (typeof value.active !== 'boolean') {
    return null
  }

  return { cityId: value.cityId.trim(), active: value.active }
}

function parseRoute(value: unknown): RouteRecord | null {
  if (
    !isRecord(value) ||
    !nonEmptyString(value.routeId) ||
    !nonEmptyString(value.cityId) ||
    !nonEmptyString(value.name) ||
    typeof value.sortOrder !== 'number' ||
    !Number.isFinite(value.sortOrder) ||
    typeof value.active !== 'boolean'
  ) {
    return null
  }

  return {
    routeId: value.routeId.trim(),
    cityId: value.cityId.trim(),
    active: value.active,
  }
}

function addIssue(
  issues: CityRouteCatalogReadinessIssueCode[],
  issue: CityRouteCatalogReadinessIssueCode
): void {
  if (!issues.includes(issue)) {
    issues.push(issue)
  }
}

/**
 * Validates only configuration readiness for a future city/route phase. It
 * deliberately neither exposes catalog records nor assigns a city or route to
 * an order. In particular, sample data is always reported as not operationally
 * ready even when its JSON shape is valid.
 */
export function loadCityRouteCatalogReadiness(
  cityDocument: unknown = cityCatalogDocument,
  routeDocument: unknown = routeCatalogDocument
): CityRouteCatalogReadiness {
  const issues: CityRouteCatalogReadinessIssueCode[] = []
  const cityVersion = catalogVersion(cityDocument)
  const routeVersion = catalogVersion(routeDocument)
  const rawCities = isRecord(cityDocument) ? cityDocument.cities : null
  const rawRoutes = isRecord(routeDocument) ? routeDocument.routes : null

  if (!cityVersion || !Array.isArray(rawCities)) {
    addIssue(issues, 'CITY_CATALOG_INVALID')
  }
  if (!routeVersion || !Array.isArray(rawRoutes)) {
    addIssue(issues, 'ROUTE_CATALOG_INVALID')
  }
  if (isSampleOnly(cityDocument)) {
    addIssue(issues, 'CITY_CATALOG_SAMPLE_ONLY')
  }
  if (isSampleOnly(routeDocument)) {
    addIssue(issues, 'ROUTE_CATALOG_SAMPLE_ONLY')
  }

  const cities = (Array.isArray(rawCities) ? rawCities : [])
    .map(parseCity)
    .filter((city): city is CityRecord => city !== null)
  const routes = (Array.isArray(rawRoutes) ? rawRoutes : [])
    .map(parseRoute)
    .filter((route): route is RouteRecord => route !== null)

  if (cities.length !== (Array.isArray(rawCities) ? rawCities.length : 0)) {
    addIssue(issues, 'CITY_CATALOG_INVALID')
  }
  if (routes.length !== (Array.isArray(rawRoutes) ? rawRoutes.length : 0)) {
    addIssue(issues, 'ROUTE_CATALOG_INVALID')
  }

  const citiesById = new Map<string, CityRecord>()
  for (const city of cities) {
    if (citiesById.has(city.cityId)) {
      addIssue(issues, 'DUPLICATE_CITY_ID')
      continue
    }
    citiesById.set(city.cityId, city)
  }

  const routeCities = new Map<string, string>()
  for (const route of routes) {
    const firstCityId = routeCities.get(route.routeId)
    if (firstCityId !== undefined) {
      addIssue(issues, 'DUPLICATE_ROUTE_ID')
      if (firstCityId !== route.cityId) {
        addIssue(issues, 'ROUTE_CITY_CONFLICT')
      }
    } else {
      routeCities.set(route.routeId, route.cityId)
    }

    const city = citiesById.get(route.cityId)
    if (!city) {
      addIssue(issues, 'ROUTE_CITY_UNKNOWN')
    } else if (!city.active) {
      addIssue(issues, 'ROUTE_CITY_INACTIVE')
    }
  }

  const activeCities = cities.filter((city) => city.active).length
  const activeRoutes = routes.filter((route) => route.active).length
  if (activeCities === 0) {
    addIssue(issues, 'NO_ACTIVE_CITIES')
  }
  if (activeRoutes === 0) {
    addIssue(issues, 'NO_ACTIVE_ROUTES')
  }

  return {
    cityCatalogVersion: cityVersion,
    routeCatalogVersion: routeVersion,
    totalCities: cities.length,
    activeCities,
    totalRoutes: routes.length,
    activeRoutes,
    isReady: issues.length === 0,
    issues,
  }
}
