import SavedReviewResultsWorkspace from '@/components/SavedReviewResultsWorkspace'

interface ResultsPageProps {
  searchParams: Promise<{ deleted?: string | string[] }>
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const { deleted } = await searchParams
  const initialDeleted = deleted === '1'

  return (
    <SavedReviewResultsWorkspace
      initialDeleted={initialDeleted}
      key={initialDeleted ? 'deleted' : 'results'}
    />
  )
}
