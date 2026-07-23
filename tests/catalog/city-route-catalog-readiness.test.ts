import {
  loadCityRouteCatalogReadiness,
} from '@/lib/catalog/city-route-catalog-readiness'

function operationalCityCatalog() {
  return {
    version: '2.0.0',
    cities: [
      {
        cityId: 'TLV',
        name: 'תל אביב',
        active: true,
      },
    ],
  }
}

function operationalRouteCatalog() {
  return {
    version: '2.0.0',
    routes: [
      {
        routeId: 'TLV-N',
        cityId: 'TLV',
        name: 'תל אביב צפון',
        sortOrder: 1,
        active: true,
      },
    ],
  }
}

describe('city and route catalog readiness', () => {
  it('reports the bundled sample-only catalogs as not operationally ready', () => {
    const readiness = loadCityRouteCatalogReadiness()

    expect(readiness).toMatchObject({
      cityCatalogVersion: '1.0.0',
      routeCatalogVersion: '1.0.0',
      totalCities: 8,
      activeCities: 8,
      totalRoutes: 0,
      activeRoutes: 0,
      isReady: false,
    })
    expect(readiness.issues).toEqual([
      'CITY_CATALOG_SAMPLE_ONLY',
      'ROUTE_CATALOG_SAMPLE_ONLY',
      'NO_ACTIVE_ROUTES',
    ])
  })

  it('accepts complete, non-sample configuration without assigning any order data', () => {
    const readiness = loadCityRouteCatalogReadiness(
      operationalCityCatalog(),
      operationalRouteCatalog()
    )

    expect(readiness).toEqual({
      cityCatalogVersion: '2.0.0',
      routeCatalogVersion: '2.0.0',
      totalCities: 1,
      activeCities: 1,
      totalRoutes: 1,
      activeRoutes: 1,
      isReady: true,
      issues: [],
    })
  })

  it('finds invalid records, duplicate identifiers, and unsafe route-to-city links', () => {
    const readiness = loadCityRouteCatalogReadiness(
      {
        version: '2.0.0',
        cities: [
          { cityId: 'TLV', name: 'תל אביב', active: true },
          { cityId: 'TLV', name: 'תל אביב נוספת', active: false },
          { cityId: 'BAD', active: true },
        ],
      },
      {
        version: '2.0.0',
        routes: [
          {
            routeId: 'TLV-N',
            cityId: 'MISSING',
            name: 'קו לא מוכר',
            sortOrder: 1,
            active: true,
          },
          {
            routeId: 'TLV-N',
            cityId: 'TLV',
            name: 'קו כפול',
            sortOrder: 2,
            active: true,
          },
        ],
      }
    )

    expect(readiness.isReady).toBe(false)
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        'CITY_CATALOG_INVALID',
        'DUPLICATE_CITY_ID',
        'DUPLICATE_ROUTE_ID',
        'ROUTE_CITY_CONFLICT',
        'ROUTE_CITY_UNKNOWN',
      ])
    )
  })

  it('blocks inactive city targets and malformed route configuration', () => {
    const readiness = loadCityRouteCatalogReadiness(
      {
        version: '2.0.0',
        cities: [{ cityId: 'TLV', name: 'תל אביב', active: false }],
      },
      {
        version: '2.0.0',
        routes: [
          {
            routeId: 'TLV-N',
            cityId: 'TLV',
            name: 'תל אביב צפון',
            sortOrder: 1,
            active: true,
          },
          {
            routeId: 'BAD-SORT',
            cityId: 'TLV',
            name: 'קו לא תקין',
            sortOrder: 'first',
            active: true,
          },
        ],
      }
    )

    expect(readiness).toMatchObject({
      activeCities: 0,
      totalRoutes: 1,
      activeRoutes: 1,
      isReady: false,
    })
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        'ROUTE_CATALOG_INVALID',
        'ROUTE_CITY_INACTIVE',
        'NO_ACTIVE_CITIES',
      ])
    )
  })
})
