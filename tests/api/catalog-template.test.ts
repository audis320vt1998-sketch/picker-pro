import { GET } from '@/app/api/catalog/template/route'
import {
  CATALOG_ONBOARDING_TEMPLATE_FILENAME,
  createCatalogOnboardingTemplateCsv,
} from '@/lib/catalog/onboarding-template'

describe('GET /api/catalog/template', () => {
  it('downloads a non-cacheable, header-only CSV without changing the catalog', async () => {
    const response = GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toContain('text/csv')
    expect(response.headers.get('Content-Disposition')).toBe(
      `attachment; filename="${CATALOG_ONBOARDING_TEMPLATE_FILENAME}"`
    )
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    const body = new Uint8Array(await response.arrayBuffer())
    expect(body).toEqual(new TextEncoder().encode(createCatalogOnboardingTemplateCsv()))
  })
})
