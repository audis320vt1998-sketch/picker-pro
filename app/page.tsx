import Link from 'next/link'

export default function Home() {
  return (
    <main>
      <h1>Picker Pro</h1>
      <p>
        כלי ליקוט ששומר מארזים ובודדים בנפרד ומציג את מקור כל כמות.
      </p>

      <nav>
        <ul>
          <li>
            <Link href="/review">הזנה ידנית ובדיקה</Link>
          </li>
          <li>
            <Link href="/upload">העלאת מסמכים</Link>
          </li>
          <li>
            <Link href="/results">תוצאות</Link>
          </li>
          <li>
            <Link href="/settings">הגדרות</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}
