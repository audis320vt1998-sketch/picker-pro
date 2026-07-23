import {
  loadCityRouteCatalogReadiness,
  loadVerifiedCatalog,
  type CityRouteCatalogReadinessIssueCode,
} from '@/lib/catalog'
import CatalogOnboardingPreflight from '@/components/CatalogOnboardingPreflight'

const settings = {
  appName: 'Picker Pro',
  exportFormat: 'csv',
  theme: 'light',
}

const CITY_ROUTE_READINESS_TEXT: Record<
  CityRouteCatalogReadinessIssueCode,
  string
> = {
  CITY_CATALOG_INVALID: 'מבנה קטלוג הערים אינו תקין.',
  ROUTE_CATALOG_INVALID: 'מבנה קטלוג קווי החלוקה אינו תקין.',
  CITY_CATALOG_SAMPLE_ONLY: 'קטלוג הערים הוא נתון דוגמה בלבד.',
  ROUTE_CATALOG_SAMPLE_ONLY: 'קטלוג קווי החלוקה הוא נתון דוגמה בלבד.',
  DUPLICATE_CITY_ID: 'נמצאו מזהי עיר כפולים.',
  DUPLICATE_ROUTE_ID: 'נמצאו מזהי קו חלוקה כפולים.',
  ROUTE_CITY_CONFLICT: 'אותו קו חלוקה מצביע ליותר מעיר אחת.',
  ROUTE_CITY_UNKNOWN: 'קו חלוקה מפנה לעיר שאינה קיימת בקטלוג.',
  ROUTE_CITY_INACTIVE: 'קו חלוקה מפנה לעיר לא פעילה.',
  NO_ACTIVE_CITIES: 'אין ערים פעילות בקטלוג.',
  NO_ACTIVE_ROUTES: 'אין קווי חלוקה פעילים בקטלוג.',
}

function catalogVersionText(version: string | null): string {
  return version ?? 'לא תקין'
}

export default function SettingsPage() {
  const { readiness } = loadVerifiedCatalog()
  const cityRouteReadiness = loadCityRouteCatalogReadiness()

  return (
    <main>
      <h1>הגדרות</h1>
      <p role="status">
        שמירת הגדרות עדיין אינה זמינה. הערכים להלן מוצגים לקריאה בלבד.
      </p>

      <fieldset disabled style={{ maxWidth: '500px', marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="appName">שם היישום:</label>
          <input
            id="appName"
            type="text"
            value={settings.appName}
            readOnly
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="exportFormat">פורמט ייצוא ברירת מחדל:</label>
          <select
            id="exportFormat"
            value={settings.exportFormat}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xlsx">XLSX</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="theme">ערכת צבעים:</label>
          <select
            id="theme"
            value={settings.theme}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          >
            <option value="light">בהירה</option>
            <option value="dark">כהה</option>
          </select>
        </div>
      </fieldset>

      <section aria-labelledby="catalog-onboarding-heading" className="settings__catalog">
        <h2 id="catalog-onboarding-heading">קטלוג מוצרים</h2>
        <p className="settings__catalog-status" role="status">
          קטלוג פעיל — גרסה {readiness.version}: {readiness.verifiedProducts}{' '}
          מאומתים מתוך {readiness.totalProducts} פריטים;{' '}
          {readiness.unverifiedProducts} ממתינים לאימות.
        </p>
        <p>
          פריט לא מאומת אינו נכנס לסיכום תפעולי. הורדת התבנית אינה מעלה קובץ,
          אינה משנה את הקטלוג ואינה מאשרת מוצר.
        </p>
        <a className="settings__download" href="/api/catalog/template">
          הורד תבנית קטלוג CSV
        </a>
        <ul>
          <li>
            התבנית ריקה ומכילה רק את העמודות של רשומת מוצר בחוזה הקטלוג הפעיל.
          </li>
          <li>
            מלא את השדה <code>verificationStatus</code> כ־<code>unverified</code>{' '}
            עד לאימות אנושי מול קטלוג המחסן או ERP.
          </li>
          <li>
            שמור ברקודים ומק&quot;טים כטקסט, וכתוב ערכי אמת/שקר כ־<code>true</code>{' '}
            או <code>false</code>.
          </li>
          <li>
            בשדה <code>aliases</code> השתמש במערך JSON, לדוגמה{' '}
            <code>[&quot;שם חלופי&quot;]</code>.
          </li>
          <li>
            לאחר הבדיקה יש להעביר את הקובץ לעדכון מבוקר של{' '}
            <code>catalogs/products.json</code>; אין עדיין ייבוא מתוך המערכת.
          </li>
        </ul>

        <CatalogOnboardingPreflight />
      </section>

      <section aria-labelledby="city-route-catalog-heading" className="settings__catalog">
        <h2 id="city-route-catalog-heading">ערים וקווי חלוקה</h2>
        <p
          className={
            cityRouteReadiness.isReady
              ? 'settings__catalog-status settings__catalog-status--ready'
              : 'settings__catalog-status settings__catalog-status--blocked'
          }
          role="status"
        >
          קטלוג ערים — גרסה {catalogVersionText(cityRouteReadiness.cityCatalogVersion)}:{' '}
          {cityRouteReadiness.activeCities} פעילות מתוך {cityRouteReadiness.totalCities}.{' '}
          קטלוג קווי חלוקה — גרסה{' '}
          {catalogVersionText(cityRouteReadiness.routeCatalogVersion)}:{' '}
          {cityRouteReadiness.activeRoutes} פעילים מתוך {cityRouteReadiness.totalRoutes}.
        </p>
        {cityRouteReadiness.isReady ? (
          <p>
            הקטלוגים עברו בדיקת מבנה בסיסית. שיוך עיר או קו להזמנה עדיין אינו
            פעיל במסך הבדיקה.
          </p>
        ) : (
          <>
            <p>
              קיבוץ לפי עיר או קו חלוקה עדיין אינו פעיל. יש להחליף את נתוני
              הדוגמה בקטלוגים תפעוליים מאומתים לפני שמוסיפים בחירה או שיוך.
            </p>
            <ul>
              {cityRouteReadiness.issues.map((issue) => (
                <li key={issue}>{CITY_ROUTE_READINESS_TEXT[issue]}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
