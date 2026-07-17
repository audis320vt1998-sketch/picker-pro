import Link from 'next/link'

export default function ResultsPage() {
  return (
    <main>
      <h1>תוצאות ליקוט</h1>
      <p role="status">
        עדיין אין תוצאות מאומתות להצגה. תוצאות זמינות רק בתוך בדיקה ידנית של
        הבקשה הנוכחית; שמירת עבודות ועיבוד OCR טרם הופעלו.
      </p>
      <p style={{ marginTop: '1rem' }}>
        <Link href="/review">עבור להזנה ידנית ובדיקה</Link>
      </p>
    </main>
  )
}
