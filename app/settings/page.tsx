const settings = {
  appName: 'Picker Pro',
  exportFormat: 'csv',
  theme: 'light',
}

export default function SettingsPage() {
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
    </main>
  )
}
