import Link from 'next/link'

export default function UploadPage() {
  return (
    <main>
      <h1>העלאת מסמכים</h1>
      <p>
        עיבוד תמונות ו‑PDF באמצעות OCR עדיין אינו זמין, ולכן העלאת מסמכים לא
        תפיק תוצאת ליקוט בשלב זה.
      </p>
      <p style={{ marginTop: '1rem' }}>
        בינתיים אפשר להזין את השורות שנקראו מהמסמך באופן ידני ולבדוק אותן מול
        הקטלוג.
      </p>
      <Link href="/review" className="manual-review__primary-button">
        עבור להזנה ידנית ובדיקה
      </Link>
    </main>
  )
}
