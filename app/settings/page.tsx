import { loadVerifiedCatalog } from '@/lib/catalog'

const settings = {
  appName: 'Picker Pro',
  exportFormat: 'csv',
  theme: 'light',
}

export default function SettingsPage() {
  const { readiness } = loadVerifiedCatalog()

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
      </section>
    </main>
  )
}
