import ManualReviewWorkspace from '@/components/ManualReviewWorkspace'
import { loadVerifiedCatalog } from '@/lib/catalog'

export default function ReviewPage() {
  const { readiness } = loadVerifiedCatalog()

  return (
    <main>
      <ManualReviewWorkspace catalogReadiness={readiness} />
    </main>
  )
}
