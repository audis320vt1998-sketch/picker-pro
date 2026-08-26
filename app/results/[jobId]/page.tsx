import SavedReviewResultsWorkspace from '@/components/SavedReviewResultsWorkspace'

interface SavedResultPageProps {
  params: Promise<{ jobId: string }>
}

export default async function SavedResultPage({ params }: SavedResultPageProps) {
  const { jobId } = await params

  return <SavedReviewResultsWorkspace jobId={jobId} />
}
