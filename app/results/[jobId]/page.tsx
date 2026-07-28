import SavedReviewResultsWorkspace from '@/components/SavedReviewResultsWorkspace'

interface SavedResultPageProps {
  params: { jobId: string }
}

export default function SavedResultPage({ params }: SavedResultPageProps) {
  return <SavedReviewResultsWorkspace jobId={params.jobId} />
}
