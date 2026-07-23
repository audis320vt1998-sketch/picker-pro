import {
  CATALOG_ONBOARDING_TEMPLATE_FILENAME,
  createCatalogOnboardingTemplateCsv,
} from '@/lib/catalog'

/**
 * Download-only catalog onboarding aid. There is intentionally no upload or
 * import route: catalog changes require a separately reviewed JSON update.
 */
export function GET() {
  return new Response(createCatalogOnboardingTemplateCsv(), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${CATALOG_ONBOARDING_TEMPLATE_FILENAME}"`,
      'Content-Type': 'text/csv; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
