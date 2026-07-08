'use client'

import React, { useState } from 'react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    appName: 'Picker Pro',
    debugMode: false,
    exportFormat: 'csv',
    theme: 'light',
  })

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = () => {
    console.log('Saving settings:', settings)
    // TODO: Implement save to backend
  }

  return (
    <main>
      <h1>Settings</h1>
      
      <form style={{ maxWidth: '500px', marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="appName">Application Name:</label>
          <input
            id="appName"
            type="text"
            value={settings.appName}
            onChange={(e) => handleChange('appName', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="exportFormat">Default Export Format:</label>
          <select
            id="exportFormat"
            value={settings.exportFormat}
            onChange={(e) => handleChange('exportFormat', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xlsx">XLSX</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="theme">Theme:</label>
          <select
            id="theme"
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            <input
              type="checkbox"
              checked={settings.debugMode}
              onChange={(e) => handleChange('debugMode', e.target.checked)}
            />
            {' '}Enable Debug Mode
          </label>
        </div>

        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Save Settings
        </button>
      </form>
    </main>
  )
}