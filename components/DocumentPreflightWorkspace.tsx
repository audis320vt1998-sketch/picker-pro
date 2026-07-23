'use client'

import Link from 'next/link'
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  assessLocalCameraCaptureReadiness,
  createOcrPreflightBatchPage,
  createOcrPreflightBatchOutcome,
  createOcrSourceDocumentRef,
  documentPreflightRowIssueText,
  getPreflightFileSelectionIssue,
  getPdfPreflightFileSelectionIssue,
  isRetryablePreflightFailure,
  MAX_PREFLIGHT_BATCH_IMAGES,
  moveOcrPreflightSelectionItem,
  PREFLIGHT_CAMERA_CAPTURE,
  PREFLIGHT_FILE_INPUT_ACCEPT,
  PDF_PREFLIGHT_FILE_INPUT_ACCEPT,
  preflightFailureCodeFromResponse,
  removeOcrPreflightSelectionItem,
  removeOcrPreflightBatchOutcomeSource,
  removeOcrPreflightPageRowSelections,
  removeOcrPreflightReplacementSlot,
  readImageMetadata,
  recordOcrPreflightBatchFailure,
  recordOcrPreflightBatchSuccess,
  requiresSourceSelectionReplacementConfirmation,
  shouldFocusCompletedOcrPreflightResult,
  upsertOcrPreflightReplacementSlot,
  type DocumentPreflightIssue,
  type DocumentPreflightResult,
  type DocumentPreflightRow,
  type LocalCameraCaptureReadiness,
  type OcrPreflightBatchPage,
  type OcrPreflightBatchFailure,
  type OcrPreflightBatchOutcome,
  type OcrPreflightFailureCode,
  type OcrPreflightReplacementSlot,
} from '@/lib/document-intake'
import {
  createOcrManualReviewHandoff,
  ocrManualReviewHandoffBlockReason,
  saveOcrManualReviewHandoff,
  toOcrManualReviewHandoffRow,
} from '@/lib/manual-review'

const OCR_UPLOAD_FILE_NAME = 'page-image'
const PDF_UPLOAD_FILE_NAME = 'document-pdf'
const CAMERA_CAPTURE_NOTE_ID = 'document-preflight-camera-note'

const HANDOFF_BLOCK_REASON_TEXT = {
  SOURCE_NOT_TRACEABLE: 'חסר מספר שורת מקור',
  PRODUCT_IDENTIFIER_MISSING: 'חסר מזהה פריט',
} as const

const ISSUE_TEXT: Record<DocumentPreflightIssue['code'], string> = {
  OCR_DRAFT_REQUIRES_REVIEW:
    'זוהי טיוטת OCR בלבד. יש לאמת כל מזהה וכל כמות מול המסמך לפני הזנה ידנית.',
  IMAGE_TOO_LOW_RESOLUTION:
    'התמונה קטנה או לא חדה מספיק. יש לצלם תקריב חד של הטבלה, או להזין את השורות ידנית.',
  DOCUMENT_LAYOUT_UNRECOGNIZED:
    'מבנה טבלת מעיין לא זוהה באופן שניתן לעקוב אחריו. לא נוצרו שורות OCR.',
  NO_TRACEABLE_ROWS:
    'זוהתה טבלה, אך לא נמצאה שורה עם מק״ט וברקוד מוצר יחד. לא נוצרו שורות OCR.',
  PDF_PAGE_RENDER_INVALID:
    'לא ניתן היה להמיר עמוד PDF לתמונה תקינה. העמוד נשאר לבדיקה ידנית.',
  PDF_PAGE_DIMENSIONS_TOO_LARGE:
    'עמוד ה־PDF גדול מדי לעיבוד בטוח. יש לחלק או לייצא את המסמך מחדש.',
  PDF_PAGE_UNREADABLE:
    'לא ניתן היה לפענח את עמוד ה־PDF ב־OCR. יש לבדוק או להזין אותו ידנית.',
}

const PREFLIGHT_FAILURE_TEXT: Record<OcrPreflightFailureCode, string> = {
  INVALID_PREFLIGHT_INPUT:
    'לא ניתן היה להכין את התמונה לבדיקה. יש לבחור תמונה חדשה או להזין את השורות ידנית.',
  REQUEST_TOO_LARGE:
    'הבקשה גדולה מדי. יש לבחור תמונה קטנה יותר או צילום קרוב יותר של הטבלה.',
  UNSUPPORTED_IMAGE_TYPE:
    'אפשר לשלוח רק תמונת JPEG, PNG או WebP. יש לבחור תמונה מתאימה.',
  IMAGE_TOO_LARGE:
    'התמונה גדולה מדי. יש לבחור תמונה קטנה יותר או צילום קרוב יותר של הטבלה.',
  INVALID_IMAGE:
    'לא ניתן לקרוא את קובץ התמונה. יש לצלם או לייצא אותו מחדש.',
  IMAGE_TYPE_MISMATCH:
    'סוג הקובץ אינו תואם לתוכן התמונה. יש לצלם או לייצא את התמונה מחדש.',
  IMAGE_DIMENSIONS_TOO_LARGE:
    'ממדי התמונה גדולים מדי. יש לחתוך או להקטין את התמונה ולבחור אותה מחדש.',
  INVALID_IMAGE_CONTENT:
    'לא ניתן לפענח את תוכן התמונה. יש לצלם או לייצא אותה מחדש.',
  OCR_PREFLIGHT_BUSY:
    'בדיקת ה־OCR עסוקה כרגע. אפשר לנסות שוב ידנית בעמוד זה בעוד רגע, או להזין ידנית.',
  OCR_PREFLIGHT_TIMEOUT:
    'בדיקת ה־OCR נמשכה זמן רב מדי. אפשר לנסות שוב ידנית בעמוד זה מאוחר יותר, או להזין ידנית.',
  OCR_PREFLIGHT_UNAVAILABLE:
    'בדיקת ה־OCR אינה זמינה כרגע. אפשר לנסות שוב ידנית בעמוד זה מאוחר יותר, או להזין ידנית.',
  UNKNOWN:
    'לא התקבלה תוצאת בדיקה תקינה. יש לבחור את התמונות מחדש או להזין את השורות ידנית.',
}

const PDF_SELECTION_FAILURE_TEXT = {
  UNSUPPORTED_PDF_TYPE: 'אפשר לבחור רק קובץ PDF אחד.',
  PDF_TOO_LARGE: 'קובץ ה־PDF גדול מדי. יש לפצל אותו או לבחור קובץ קטן יותר.',
  INVALID_PDF_FILE: 'לא ניתן לקרוא את קובץ ה־PDF שנבחר.',
} as const

const PDF_PREFLIGHT_FAILURE_TEXT = {
  INVALID_PDF_PREFLIGHT_INPUT: 'לא ניתן להכין את קובץ ה־PDF לבדיקה. בחר קובץ חדש.',
  REQUEST_TOO_LARGE: 'הבקשה גדולה מדי. יש לפצל את קובץ ה־PDF ולנסות שוב.',
  UNSUPPORTED_PDF_TYPE: 'אפשר לשלוח רק קובץ PDF.',
  PDF_TOO_LARGE: 'קובץ ה־PDF גדול מדי לעיבוד.',
  INVALID_PDF: 'לא ניתן לקרוא את תוכן קובץ ה־PDF. יש לייצא אותו מחדש.',
  PDF_TOO_MANY_PAGES: 'אפשר לבדוק עד 20 עמודים בקובץ PDF אחד.',
  PDF_RENDERER_UNAVAILABLE:
    'המרת PDF אינה זמינה כרגע בשרת. אפשר לבחור תמונות או להזין ידנית.',
  PDF_RENDER_FAILED: 'לא ניתן להמיר את קובץ ה־PDF לעמודים. יש לייצא אותו מחדש.',
  OCR_PREFLIGHT_BUSY: 'בדיקת ה־OCR עסוקה כרגע. נסה שוב מאוחר יותר.',
  OCR_PREFLIGHT_TIMEOUT: 'בדיקת קובץ ה־PDF נמשכה זמן רב מדי. נסה שוב או הזן ידנית.',
  OCR_PREFLIGHT_UNAVAILABLE: 'בדיקת ה־OCR אינה זמינה כרגע. נסה שוב מאוחר יותר.',
  UNKNOWN: 'לא התקבלה תוצאת PDF תקינה. יש לנסות שוב או להזין ידנית.',
} as const

interface SelectedSourceImage {
  file: File
  sourceDocumentRef: string
}

type SourceSelectionKind = 'camera' | 'images' | 'pdf' | null

type PendingSourceSelection =
  | { kind: 'camera'; file: File }
  | { kind: 'images'; files: readonly File[] }
  | { kind: 'pdf'; file: File }

type CameraCaptureReadinessState =
  | { kind: 'CHECKING' }
  | LocalCameraCaptureReadiness

interface PreviewedSourceImage {
  pageNumber: number
  sourceDocumentRef: string
}

interface ActiveLocalPreview {
  sourceDocumentRef: string
  url: string
}

interface SourceImagePreviewProps {
  hasSourceImage: boolean
  isVisible: boolean
  localPreviewUrl: string | null
  onToggle: () => void
  pageNumber: number
}

interface SourceImageReplacementProps {
  disabled: boolean
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void
  pageNumber: number
}

type PreflightActivity =
  | { kind: 'batch'; current: number; total: number }
  | { kind: 'pdf' }
  | { kind: 'retry'; pageNumber: number }
  | { kind: 'replacement'; pageNumber: number }
  | null

type PreflightPageAttempt =
  | { kind: 'success'; batchPage: OcrPreflightBatchPage }
  | { kind: 'failure'; code: OcrPreflightFailureCode }

type PdfPreflightAttempt =
  | { kind: 'success'; result: DocumentPreflightResult }
  | { kind: 'failure'; code: keyof typeof PDF_PREFLIGHT_FAILURE_TEXT }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDocumentPreflightResult(value: unknown): value is DocumentPreflightResult {
  return (
    isRecord(value) &&
    value.kind === 'DOCUMENT_PREFLIGHT' &&
    value.status === 'NEEDS_REVIEW' &&
    value.profile === 'MAAYAN_PRICE_OFFER_V1' &&
    Array.isArray(value.pages)
  )
}

/**
 * Sends a selected image under a neutral multipart name. Only the whitelisted
 * failure code is retained; the API's error text and response body never
 * reach the review UI.
 */
async function requestPreflightPage(
  selectedFile: SelectedSourceImage,
  pageNumber: number
): Promise<PreflightPageAttempt> {
  try {
    const form = new FormData()
    form.append('file', selectedFile.file, OCR_UPLOAD_FILE_NAME)
    const response = await fetch('/api/intake/preflight', {
      method: 'POST',
      body: form,
    })
    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      return { kind: 'failure', code: preflightFailureCodeFromResponse(body) }
    }
    if (!isDocumentPreflightResult(body) || body.pages.length !== 1) {
      return { kind: 'failure', code: 'UNKNOWN' }
    }

    try {
      return {
        kind: 'success',
        batchPage: createOcrPreflightBatchPage(
          body.pages[0],
          pageNumber,
          selectedFile.sourceDocumentRef
        ),
      }
    } catch {
      return { kind: 'failure', code: 'UNKNOWN' }
    }
  } catch {
    return { kind: 'failure', code: 'OCR_PREFLIGHT_UNAVAILABLE' }
  }
}

async function requestPdfPreflight(file: File): Promise<PdfPreflightAttempt> {
  try {
    const form = new FormData()
    form.append('file', file, PDF_UPLOAD_FILE_NAME)
    const response = await fetch('/api/intake/pdf-preflight', {
      method: 'POST',
      body: form,
    })
    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const code =
        isRecord(body) && typeof body.code === 'string' && body.code in PDF_PREFLIGHT_FAILURE_TEXT
          ? (body.code as keyof typeof PDF_PREFLIGHT_FAILURE_TEXT)
          : 'UNKNOWN'
      return { kind: 'failure', code }
    }
    if (!isDocumentPreflightResult(body) || body.pages.length === 0) {
      return { kind: 'failure', code: 'UNKNOWN' }
    }

    return { kind: 'success', result: body }
  } catch {
    return { kind: 'failure', code: 'OCR_PREFLIGHT_UNAVAILABLE' }
  }
}

function displayQuantity(value: number | null): string {
  return value === null ? 'לא זוהה' : String(value)
}

function rowKey(pageNumber: number, row: DocumentPreflightRow): string {
  return `${pageNumber}:${row.source.parserRowIndex}`
}

function createSourceDocumentRef(): string {
  const randomBytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(randomBytes)
  return createOcrSourceDocumentRef(randomBytes)
}

function createLocalPreviewUrl(file: File): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null
  }

  try {
    return URL.createObjectURL(file)
  } catch {
    return null
  }
}

function revokeLocalPreviewUrl(url: string | null): void {
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // Releasing a local preview must never interrupt the review workflow.
    }
  }
}

function SourceImagePreview({
  hasSourceImage,
  isVisible,
  localPreviewUrl,
  onToggle,
  pageNumber,
}: SourceImagePreviewProps) {
  if (!hasSourceImage) {
    return null
  }

  const previewId = `source-preview-page-${pageNumber}`

  return (
    <div className="document-preflight__preview">
      <button
        aria-controls={previewId}
        aria-expanded={isVisible}
        className="manual-review__secondary-button"
        onClick={onToggle}
        type="button"
      >
        {isVisible ? 'הסתר תמונת מקור זמנית' : 'הצג תמונת מקור זמנית'}
      </button>
      {isVisible &&
        (localPreviewUrl ? (
          <figure id={previewId}>
            <figcaption>
              תצוגה מקדימה זו מציגה את קובץ המקור כפי שנבחר, ולכן ייתכן שהוא
              כולל פרטי מסמך או לקוח. היא נוצרת מקומית בדפדפן בלבד, אינה נכתבת
              לאחסון ואינה מועברת למסך הבדיקה. שליחת הקובץ לעיבוד OCR מתרחשת רק
              בלחיצה על ״צור טיוטות OCR״.
            </figcaption>
            {/* The browser-only object URL cannot be rendered by next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`תמונת מקור זמנית לעמוד ${pageNumber}`}
              decoding="async"
              loading="lazy"
              referrerPolicy="no-referrer"
              src={localPreviewUrl}
            />
          </figure>
        ) : (
          <p className="document-preflight__preview-unavailable" id={previewId}>
            התצוגה המקדימה אינה זמינה בדפדפן זה.
          </p>
        ))}
    </div>
  )
}

function CameraCaptureReadinessNotice({
  readiness,
}: {
  readiness: CameraCaptureReadinessState | null
}) {
  if (!readiness) {
    return null
  }

  if (readiness.kind === 'CHECKING') {
    return (
      <p
        aria-atomic="true"
        className="document-preflight__camera-readiness"
        role="status"
      >
        בודק מקומית את ממדי הצילום. התמונה עדיין לא נשלחת ל־OCR.
      </p>
    )
  }

  const dimensions =
    readiness.kind === 'UNREADABLE' ? null : (
      <span className="document-preflight__camera-dimensions" dir="ltr">
        {readiness.width} × {readiness.height}
      </span>
    )

  if (readiness.kind === 'READY') {
    return (
      <p
        aria-atomic="true"
        className="document-preflight__camera-readiness document-preflight__camera-readiness--ready"
        role="status"
      >
        בדיקה מקומית בדפדפן: ממדי הצילום {dimensions} עומדים בסף הבסיסי ל־OCR.
        הבדיקה אינה נשלחת לרשת ואינה בודקת חדות או צל.
      </p>
    )
  }

  if (readiness.kind === 'LOW_RESOLUTION') {
    return (
      <p
        aria-atomic="true"
        className="document-preflight__camera-readiness document-preflight__camera-readiness--advisory"
        role="status"
      >
        בדיקה מקומית בדפדפן: ממדי הצילום {dimensions} קטנים מדי ל־OCR אמין.
        מומלץ לצלם שוב מקרוב. אפשר לשלוח לבדיקה בשרת, אך ייתכן שלא תיווצר
        טיוטת OCR.
      </p>
    )
  }

  if (readiness.kind === 'TOO_MANY_PIXELS') {
    return (
      <p
        aria-atomic="true"
        className="document-preflight__camera-readiness document-preflight__camera-readiness--advisory"
        role="status"
      >
        בדיקה מקומית בדפדפן: ממדי הצילום {dimensions} גדולים מדי לעיבוד בטוח.
        מומלץ לצלם ברזולוציה נמוכה יותר או לבחור צילום קטן יותר. אפשר לשלוח
        לבדיקה בשרת, אך הקובץ עשוי להידחות.
      </p>
    )
  }

  if (readiness.kind === 'TYPE_MISMATCH') {
    return (
      <p
        aria-atomic="true"
        className="document-preflight__camera-readiness document-preflight__camera-readiness--advisory"
        role="status"
      >
        בדיקה מקומית בדפדפן: סוג הקובץ אינו תואם לתוכן הצילום. מומלץ לצלם שוב.
        אפשר לשלוח לבדיקה בשרת, אך הקובץ עשוי להידחות.
      </p>
    )
  }

  return (
    <p
      aria-atomic="true"
      className="document-preflight__camera-readiness document-preflight__camera-readiness--advisory"
      role="status"
    >
      בדיקה מקומית בדפדפן: לא ניתן לאמת את ממדי הצילום. מומלץ לצלם שוב או
      לבדוק את התצוגה המקדימה. אפשר לשלוח לבדיקה בשרת, אך הקובץ עשוי להידחות.
    </p>
  )
}

function SourceImageReplacement({
  disabled,
  onSelect,
  pageNumber,
}: SourceImageReplacementProps) {
  const cameraNoteId = `document-preflight-replacement-camera-note-${pageNumber}`

  return (
    <div>
      <div className="document-preflight__source-actions">
        <label className="document-preflight__file-label">
          החלף תמונה לעמוד {pageNumber}
          <input
            accept={PREFLIGHT_FILE_INPUT_ACCEPT}
            disabled={disabled}
            onChange={onSelect}
            type="file"
          />
        </label>
        <label className="document-preflight__file-label">
          צלם מחדש — עמוד {pageNumber}
          <input
            accept={PREFLIGHT_FILE_INPUT_ACCEPT}
            aria-describedby={cameraNoteId}
            capture={PREFLIGHT_CAMERA_CAPTURE}
            disabled={disabled}
            onChange={onSelect}
            type="file"
          />
        </label>
      </div>
      <p className="document-preflight__selected">
        צלם את אותו עמוד בלבד: החזק את הטלפון ישר, מלא את הפריים בטבלה והימנע
        מצל. למסמך או לעמוד אחר יש ליצור אצווה חדשה. הבחירה אינה שולחת את
        התמונה עד להפעלה מפורשת של OCR מחדש.
      </p>
      <p className="document-preflight__camera-note" id={cameraNoteId}>
        צילום חלופי מחליף רק את העמוד הזה ושומר את מזהה המקור שלו. הדפדפן יכול
        לפתוח מצלמה או בורר קבצים; התמונה אינה נשלחת עד להפעלה מפורשת של OCR.
      </p>
    </div>
  )
}

function canTransferRow(
  row: DocumentPreflightRow,
  sourceDocumentRef: string
): boolean {
  return toOcrManualReviewHandoffRow({ row, sourceDocumentRef }) !== null
}

export default function DocumentPreflightWorkspace() {
  const [files, setFiles] = useState<readonly SelectedSourceImage[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [sourceSelectionKind, setSourceSelectionKind] =
    useState<SourceSelectionKind>(null)
  const [pendingSourceSelection, setPendingSourceSelection] =
    useState<PendingSourceSelection | null>(null)
  const [pdfPageSourceRefs, setPdfPageSourceRefs] = useState<readonly string[]>([])
  const [outcome, setOutcome] = useState<OcrPreflightBatchOutcome | null>(null)
  const [pendingReplacementPages, setPendingReplacementPages] = useState<
    readonly OcrPreflightReplacementSlot[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [cameraCaptureReadiness, setCameraCaptureReadiness] =
    useState<CameraCaptureReadinessState | null>(null)
  const [activity, setActivity] = useState<PreflightActivity>(null)
  const [previewedSource, setPreviewedSource] = useState<PreviewedSourceImage | null>(
    null
  )
  const [activeLocalPreview, setActiveLocalPreview] =
    useState<ActiveLocalPreview | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Record<string, boolean>>({})
  const [hasConfirmedSourceCheck, setHasConfirmedSourceCheck] = useState(false)
  const preflightActionLock = useRef(false)
  const sourceSelectionConfirmationRef = useRef<HTMLElement>(null)
  const resultHeadingRef = useRef<HTMLHeadingElement>(null)

  const isSubmitting = activity !== null
  const pages = outcome?.pages ?? []
  const failedPages = outcome?.failures ?? []
  const isSelectionLocked = isSubmitting || pendingSourceSelection !== null
  const isSingleCameraCaptureReadyToInspect =
    sourceSelectionKind === 'camera' && files.length === 1 && outcome === null
  const selectedCameraCapture = isSingleCameraCaptureReadyToInspect
    ? files[0] ?? null
    : null
  const isCameraCapturePreviewVisible =
    selectedCameraCapture !== null &&
    previewedSource?.pageNumber === 1 &&
    previewedSource.sourceDocumentRef === selectedCameraCapture.sourceDocumentRef
  const isCompletedOcrResultReady = shouldFocusCompletedOcrPreflightResult(
    outcome,
    isSubmitting
  )

  const previewedFile = previewedSource
    ? files.find(
        ({ sourceDocumentRef }) => sourceDocumentRef === previewedSource.sourceDocumentRef
      )?.file ?? null
    : null

  useEffect(() => {
    setActiveLocalPreview(null)
    if (!previewedSource || !previewedFile) {
      return
    }

    const url = createLocalPreviewUrl(previewedFile)
    if (!url) {
      return
    }

    setActiveLocalPreview({ sourceDocumentRef: previewedSource.sourceDocumentRef, url })
    return () => revokeLocalPreviewUrl(url)
  }, [previewedFile, previewedSource])

  useEffect(() => {
    let isCurrentCapture = true

    if (!selectedCameraCapture) {
      setCameraCaptureReadiness(null)
      return () => {
        isCurrentCapture = false
      }
    }

    setCameraCaptureReadiness({ kind: 'CHECKING' })
    void (async () => {
      try {
        const buffer = await selectedCameraCapture.file.arrayBuffer()
        if (!isCurrentCapture) {
          return
        }

        setCameraCaptureReadiness(
          assessLocalCameraCaptureReadiness({
            declaredMediaType: selectedCameraCapture.file.type,
            metadata: readImageMetadata(new Uint8Array(buffer)),
          })
        )
      } catch {
        if (isCurrentCapture) {
          setCameraCaptureReadiness({ kind: 'UNREADABLE' })
        }
      }
    })()

    return () => {
      isCurrentCapture = false
    }
  }, [selectedCameraCapture])

  useEffect(() => {
    if (isCompletedOcrResultReady) {
      resultHeadingRef.current?.focus()
    }
  }, [isCompletedOcrResultReady])

  useEffect(() => {
    if (pendingSourceSelection) {
      sourceSelectionConfirmationRef.current?.focus()
    }
  }, [pendingSourceSelection])

  const resetDraftAfterSelectionChange = () => {
    setError(null)
    setOutcome(null)
    setPendingReplacementPages([])
    setPreviewedSource(null)
    setActiveLocalPreview(null)
    setSelectedRowKeys({})
    setHasConfirmedSourceCheck(false)
    setPdfFile(null)
    setPdfPageSourceRefs([])
    setSourceSelectionKind(null)
    setPendingSourceSelection(null)
  }

  const canEditSelectedBatch = !isSelectionLocked && outcome === null

  const setSelectedImages = (
    selectedFiles: readonly File[],
    selectionKind: Exclude<SourceSelectionKind, 'pdf' | null>
  ) => {
    resetDraftAfterSelectionChange()

    try {
      setFiles(
        selectedFiles.map((file) => ({
          file,
          sourceDocumentRef: createSourceDocumentRef(),
        }))
      )
      setSourceSelectionKind(selectionKind)
    } catch {
      setFiles([])
      setPendingReplacementPages([])
      setError('הדפדפן לא הצליח ליצור מזהה זמני ובטוח למסמך. נסה שוב.')
    }
  }

  const setSelectedPdf = (selectedPdf: File) => {
    resetDraftAfterSelectionChange()
    setFiles([])
    setPdfFile(selectedPdf)
    setSourceSelectionKind('pdf')
  }

  const applySourceSelection = (selection: PendingSourceSelection) => {
    if (selection.kind === 'pdf') {
      setSelectedPdf(selection.file)
      return
    }

    setSelectedImages(
      selection.kind === 'camera' ? [selection.file] : selection.files,
      selection.kind
    )
  }

  const queueSourceSelection = (selection: PendingSourceSelection) => {
    if (
      requiresSourceSelectionReplacementConfirmation({
        selectedImageCount: files.length,
        hasPdfSelection: pdfFile !== null,
        hasPreflightOutcome: outcome !== null,
      })
    ) {
      setError(null)
      setPendingSourceSelection(selection)
      return
    }

    applySourceSelection(selection)
  }

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''

    if (
      preflightActionLock.current ||
      pendingSourceSelection ||
      selectedFiles.length === 0
    ) {
      return
    }
    if (selectedFiles.length > MAX_PREFLIGHT_BATCH_IMAGES) {
      setError(`אפשר לבחור עד ${MAX_PREFLIGHT_BATCH_IMAGES} תמונות בכל אצווה.`)
      return
    }

    const selectionIssue = selectedFiles
      .map((file) => getPreflightFileSelectionIssue(file))
      .find((issue) => issue !== null)
    if (selectionIssue) {
      setError(PREFLIGHT_FAILURE_TEXT[selectionIssue])
      return
    }

    queueSourceSelection({ kind: 'images', files: selectedFiles })
  }

  const selectCameraCapture = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''

    if (
      preflightActionLock.current ||
      pendingSourceSelection ||
      selectedFiles.length === 0
    ) {
      return
    }
    if (selectedFiles.length !== 1) {
      setError('יש לצלם או לבחור תמונה אחת בלבד בכל פעולה מהמצלמה.')
      return
    }

    const cameraCapture = selectedFiles[0]
    const selectionIssue = getPreflightFileSelectionIssue(cameraCapture)
    if (selectionIssue) {
      setError(PREFLIGHT_FAILURE_TEXT[selectionIssue])
      return
    }

    queueSourceSelection({ kind: 'camera', file: cameraCapture })
  }

  const confirmSourceSelectionReplacement = () => {
    if (!pendingSourceSelection || preflightActionLock.current) {
      return
    }

    applySourceSelection(pendingSourceSelection)
  }

  const selectPdf = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''

    if (
      preflightActionLock.current ||
      pendingSourceSelection ||
      selectedFiles.length === 0
    ) {
      return
    }
    if (selectedFiles.length !== 1) {
      setError('יש לבחור קובץ PDF אחד בלבד.')
      return
    }

    const selectedPdf = selectedFiles[0]
    const selectionIssue = getPdfPreflightFileSelectionIssue(selectedPdf)
    if (selectionIssue) {
      setError(PDF_SELECTION_FAILURE_TEXT[selectionIssue])
      return
    }

    queueSourceSelection({ kind: 'pdf', file: selectedPdf })
  }

  const moveSelectedFile = (currentIndex: number, destinationIndex: number) => {
    if (
      !canEditSelectedBatch ||
      currentIndex < 0 ||
      destinationIndex < 0 ||
      currentIndex >= files.length ||
      destinationIndex >= files.length
    ) {
      return
    }

    resetDraftAfterSelectionChange()
    setFiles((current) =>
      moveOcrPreflightSelectionItem(current, currentIndex, destinationIndex)
    )
  }

  const removeSelectedFile = (index: number) => {
    if (!canEditSelectedBatch || index < 0 || index >= files.length) {
      return
    }

    resetDraftAfterSelectionChange()
    setFiles((current) => removeOcrPreflightSelectionItem(current, index))
  }

  const selectReplacementFile = (
    event: ChangeEvent<HTMLInputElement>,
    replacementSlot: OcrPreflightReplacementSlot
  ) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.currentTarget.value = ''

    if (preflightActionLock.current || selectedFiles.length === 0) {
      return
    }
    if (selectedFiles.length !== 1) {
      setError('יש לבחור תמונה אחת להחלפת העמוד.')
      return
    }

    const replacementFile = selectedFiles[0]
    const selectionIssue = getPreflightFileSelectionIssue(replacementFile)
    if (selectionIssue) {
      setError(PREFLIGHT_FAILURE_TEXT[selectionIssue])
      return
    }

    const selectedFileIndex = files.findIndex(
      ({ sourceDocumentRef }) =>
        sourceDocumentRef === replacementSlot.sourceDocumentRef
    )
    if (
      selectedFileIndex < 0 ||
      selectedFileIndex + 1 !== replacementSlot.pageNumber
    ) {
      setError('לא ניתן לגשת לתמונה שנבחרה. יש לבחור את התמונות מחדש או להזין ידנית.')
      return
    }

    setError(null)
    setFiles((current) =>
      current.map((selectedFile) =>
        selectedFile.sourceDocumentRef === replacementSlot.sourceDocumentRef
          ? { ...selectedFile, file: replacementFile }
          : selectedFile
      )
    )
    setOutcome((current) =>
      current
        ? removeOcrPreflightBatchOutcomeSource(
            current,
            replacementSlot.sourceDocumentRef
          )
        : current
    )
    setPendingReplacementPages((current) =>
      upsertOcrPreflightReplacementSlot(current, replacementSlot)
    )
    setSelectedRowKeys((current) =>
      removeOcrPreflightPageRowSelections(current, replacementSlot.pageNumber)
    )
    setHasConfirmedSourceCheck(false)
    if (previewedSource?.sourceDocumentRef === replacementSlot.sourceDocumentRef) {
      setPreviewedSource(null)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (preflightActionLock.current) {
      return
    }
    if (pendingSourceSelection) {
      setError('יש לאשר או לבטל את החלפת המקור לפני הפעלת OCR.')
      return
    }
    if (files.length === 0 && !pdfFile) {
      setError('יש לבחור לפחות תמונת JPEG, PNG או WebP אחת.')
      return
    }

    preflightActionLock.current = true
    setError(null)
    setOutcome(createOcrPreflightBatchOutcome())
    setPendingReplacementPages([])
    setPreviewedSource(null)
    setActiveLocalPreview(null)
    setSelectedRowKeys({})
    setHasConfirmedSourceCheck(false)
    if (pdfFile) {
      setActivity({ kind: 'pdf' })
      try {
        const attempt = await requestPdfPreflight(pdfFile)
        if (attempt.kind === 'failure') {
          setOutcome(null)
          setError(PDF_PREFLIGHT_FAILURE_TEXT[attempt.code])
          return
        }

        try {
          let nextOutcome = createOcrPreflightBatchOutcome()
          const nextSourceRefs: string[] = []
          for (const page of attempt.result.pages) {
            const sourceDocumentRef = createSourceDocumentRef()
            nextSourceRefs.push(sourceDocumentRef)
            nextOutcome = recordOcrPreflightBatchSuccess(
              nextOutcome,
              createOcrPreflightBatchPage(
                page,
                page.pageNumber,
                sourceDocumentRef
              )
            )
          }
          setPdfPageSourceRefs(nextSourceRefs)
          setOutcome(nextOutcome)
        } catch {
          setOutcome(null)
          setError(PDF_PREFLIGHT_FAILURE_TEXT.UNKNOWN)
        }
        return
      } finally {
        preflightActionLock.current = false
        setActivity(null)
      }
    }

    setActivity({ kind: 'batch', current: 0, total: files.length })

    try {
      for (const [index, selectedFile] of files.entries()) {
        const pageNumber = index + 1
        setActivity({ kind: 'batch', current: pageNumber, total: files.length })
        const attempt = await requestPreflightPage(selectedFile, pageNumber)

        setOutcome((current) => {
          const currentOutcome = current ?? createOcrPreflightBatchOutcome()
          if (attempt.kind === 'success') {
            return recordOcrPreflightBatchSuccess(currentOutcome, attempt.batchPage)
          }

          return recordOcrPreflightBatchFailure(currentOutcome, {
            pageNumber,
            sourceDocumentRef: selectedFile.sourceDocumentRef,
            code: attempt.code,
          })
        })
      }
    } finally {
      preflightActionLock.current = false
      setActivity(null)
    }
  }

  const retryFailedPage = async (failedPage: OcrPreflightBatchFailure) => {
    if (
      preflightActionLock.current ||
      !isRetryablePreflightFailure(failedPage.code)
    ) {
      return
    }

    const selectedFileIndex = files.findIndex(
      ({ sourceDocumentRef }) => sourceDocumentRef === failedPage.sourceDocumentRef
    )
    if (selectedFileIndex < 0 || selectedFileIndex + 1 !== failedPage.pageNumber) {
      setError('לא ניתן לגשת לתמונה שנבחרה. יש לבחור את התמונות מחדש או להזין ידנית.')
      return
    }

    const selectedFile = files[selectedFileIndex]
    preflightActionLock.current = true
    setError(null)
    setActivity({ kind: 'retry', pageNumber: failedPage.pageNumber })

    try {
      const attempt = await requestPreflightPage(selectedFile, failedPage.pageNumber)
      setOutcome((current) => {
        const currentOutcome = current ?? createOcrPreflightBatchOutcome()
        if (attempt.kind === 'success') {
          return recordOcrPreflightBatchSuccess(currentOutcome, attempt.batchPage)
        }

        return recordOcrPreflightBatchFailure(currentOutcome, {
          ...failedPage,
          code: attempt.code,
        })
      })
    } finally {
      preflightActionLock.current = false
      setActivity(null)
    }
  }

  const reprocessReplacementPage = async (
    replacementSlot: OcrPreflightReplacementSlot
  ) => {
    if (
      preflightActionLock.current ||
      !pendingReplacementPages.some(
        ({ sourceDocumentRef }) =>
          sourceDocumentRef === replacementSlot.sourceDocumentRef
      )
    ) {
      return
    }

    const selectedFileIndex = files.findIndex(
      ({ sourceDocumentRef }) =>
        sourceDocumentRef === replacementSlot.sourceDocumentRef
    )
    if (
      selectedFileIndex < 0 ||
      selectedFileIndex + 1 !== replacementSlot.pageNumber
    ) {
      setError('לא ניתן לגשת לתמונה שנבחרה. יש לבחור את התמונות מחדש או להזין ידנית.')
      return
    }

    const selectedFile = files[selectedFileIndex]
    preflightActionLock.current = true
    setError(null)
    setActivity({ kind: 'replacement', pageNumber: replacementSlot.pageNumber })

    try {
      const attempt = await requestPreflightPage(
        selectedFile,
        replacementSlot.pageNumber
      )
      setOutcome((current) => {
        const currentOutcome = current ?? createOcrPreflightBatchOutcome()
        if (attempt.kind === 'success') {
          return recordOcrPreflightBatchSuccess(currentOutcome, attempt.batchPage)
        }

        return recordOcrPreflightBatchFailure(currentOutcome, {
          pageNumber: replacementSlot.pageNumber,
          sourceDocumentRef: replacementSlot.sourceDocumentRef,
          code: attempt.code,
        })
      })
      setPendingReplacementPages((current) =>
        removeOcrPreflightReplacementSlot(
          current,
          replacementSlot.sourceDocumentRef
        )
      )
    } finally {
      preflightActionLock.current = false
      setActivity(null)
    }
  }

  const toggleRowSelection = (key: string, selected: boolean) => {
    setSelectedRowKeys((current) => ({ ...current, [key]: selected }))
    setHasConfirmedSourceCheck(false)
  }

  const toggleSourcePreview = (pageNumber: number, sourceDocumentRef: string) => {
    setActiveLocalPreview(null)
    setPreviewedSource((current) =>
      current?.sourceDocumentRef === sourceDocumentRef
        ? null
        : { pageNumber, sourceDocumentRef }
    )
  }

  const selectedRows = pages.flatMap(({ page, sourceDocumentRef }) =>
    page.rows
      .filter(
        (row) =>
          selectedRowKeys[rowKey(page.pageNumber, row)] &&
          canTransferRow(row, sourceDocumentRef)
      )
      .map((row) => ({ row, sourceDocumentRef }))
  )

  const transferToManualReview = () => {
    const handoff = createOcrManualReviewHandoff(selectedRows)
    if (!handoff || !hasConfirmedSourceCheck) {
      setError('יש לבחור שורות עם מזהה פריט ומספר מקור ולאשר שבוצעה בדיקה מול המסמך.')
      return
    }

    try {
      saveOcrManualReviewHandoff(window.sessionStorage, handoff)
      window.location.assign('/review')
    } catch {
      setError('לא ניתן לשמור את טיוטת הבדיקה בדפדפן. עבור להזנה ידנית.')
    }
  }

  return (
    <div className="manual-review document-preflight" dir="rtl">
      <section className="manual-review__intro">
        <h1>קריאת מסמכים לביקורת</h1>
        <p>
          העלה תמונה אחת או יותר, או קובץ PDF אחד, של טבלאות הזמנה. כל עמוד
          מעובד בנפרד ובסדר המקור, ומוחזר רק כטיוטת OCR לביקורת — ללא יצירת
          ליקוט, התאמת קטלוג או שמירת המסמך.
        </p>
      </section>

      <form
        aria-busy={isSubmitting}
        className="manual-review__form"
        onSubmit={submit}
      >
        <section
          aria-labelledby="document-preflight-camera-title"
          className="document-preflight__camera-capture"
        >
          <p className="document-preflight__step">שלב 1 מתוך 3</p>
          <h2 id="document-preflight-camera-title">צלם עמוד מהטלפון</h2>
          <p>
            צלם עמוד אחד בכל פעם. החזק את הטלפון ישר, מלא את הפריים בטבלה, ודא
            שאין צל ושהטקסט חד.
          </p>
          <label className="document-preflight__camera-button">
            <span>פתח מצלמה אחורית לצילום עמוד</span>
            <input
              accept={PREFLIGHT_FILE_INPUT_ACCEPT}
              aria-describedby={CAMERA_CAPTURE_NOTE_ID}
              aria-label="פתח מצלמה אחורית לצילום עמוד מסמך אחד"
              capture={PREFLIGHT_CAMERA_CAPTURE}
              disabled={isSelectionLocked}
              onChange={selectCameraCapture}
              type="file"
            />
          </label>
          <p className="document-preflight__camera-note" id={CAMERA_CAPTURE_NOTE_ID}>
            בדפדפן תומך תיפתח המצלמה האחורית; בדפדפנים אחרים עשוי להיפתח בורר
            קבצים. התמונה נשארת בדפדפן עד ללחיצה המפורשת על בדיקת OCR. נתמכים
            JPEG, PNG ו־WebP.
          </p>
        </section>

        {pendingSourceSelection && (
          <aside
            className="document-preflight__camera-confirmation"
            ref={sourceSelectionConfirmationRef}
            role="alert"
            tabIndex={-1}
          >
            <strong>
              {pendingSourceSelection.kind === 'camera'
                ? 'הצילום החדש עדיין לא החליף את הבחירה הקיימת.'
                : pendingSourceSelection.kind === 'images'
                  ? 'התמונות החדשות עדיין לא החליפו את הבחירה הקיימת.'
                  : 'קובץ ה־PDF החדש עדיין לא החליף את הבחירה הקיימת.'}
            </strong>
            <p>
              אם תאשר, הבחירה הנוכחית והטיוטות שטרם הועברו יוחלפו{' '}
              {pendingSourceSelection.kind === 'camera'
                ? 'בצילום החדש.'
                : pendingSourceSelection.kind === 'images'
                  ? `ב־${pendingSourceSelection.files.length} תמונות חדשות.`
                  : 'בקובץ ה־PDF החדש.'}{' '}
              המקור החדש עדיין לא נשלח ל־OCR.
            </p>
            <div className="document-preflight__source-actions">
              <button
                className="manual-review__primary-button"
                onClick={confirmSourceSelectionReplacement}
                type="button"
              >
                {pendingSourceSelection.kind === 'camera'
                  ? 'החלף בצילום החדש'
                  : pendingSourceSelection.kind === 'images'
                    ? 'החלף בתמונות החדשות'
                    : 'החלף בקובץ ה־PDF החדש'}
              </button>
              <button
                className="manual-review__secondary-button"
                onClick={() => setPendingSourceSelection(null)}
                type="button"
              >
                שמור את הבחירה הקיימת
              </button>
            </div>
          </aside>
        )}

        <details className="document-preflight__alternative-sources">
          <summary>אפשרויות נוספות: תמונות קיימות או PDF</summary>
          <div className="document-preflight__source-actions">
            <label className="document-preflight__file-label">
              בחר תמונות מסמך קיימות
              <input
                accept={PREFLIGHT_FILE_INPUT_ACCEPT}
                disabled={isSelectionLocked}
                multiple
                onChange={selectFiles}
                type="file"
              />
            </label>
            <label className="document-preflight__file-label">
              בחר קובץ PDF
              <input
                accept={PDF_PREFLIGHT_FILE_INPUT_ACCEPT}
                disabled={isSelectionLocked}
                onChange={selectPdf}
                type="file"
              />
            </label>
          </div>
        </details>
        {files.length > 0 && (
          <section
            aria-labelledby="document-preflight-selection-title"
            className="document-preflight__selection"
          >
            <h2 id="document-preflight-selection-title">
              {isSingleCameraCaptureReadyToInspect
                ? 'שלב 2 מתוך 3 — בדוק את הצילום'
                : 'סדר עמודים לפני OCR'}
            </h2>
            <p className="document-preflight__selected">
              {isSingleCameraCaptureReadyToInspect
                ? 'נבחר צילום אחד. הוא עדיין לא נשלח ל־OCR.'
                : `נבחרו ${files.length} תמונות. שמות הקבצים אינם מוצגים או נשמרים בתוצאה.`}
            </p>
            {canEditSelectedBatch ? (
              isSingleCameraCaptureReadyToInspect && selectedCameraCapture ? (
                <div className="document-preflight__camera-preview">
                  <p>
                    בדיקת הממדים המקומית אינה בודקת חדות או צל. פתח את התצוגה
                    המקדימה ובדוק שהטבלה חדה, ישרה וממלאת את התמונה.
                  </p>
                  <CameraCaptureReadinessNotice
                    readiness={cameraCaptureReadiness}
                  />
                  <label className="document-preflight__camera-button document-preflight__camera-recapture">
                    <span>צלם שוב — צילום חדש יחליף רק לאחר אישור</span>
                    <input
                      accept={PREFLIGHT_FILE_INPUT_ACCEPT}
                      aria-describedby={CAMERA_CAPTURE_NOTE_ID}
                      aria-label="צלם שוב עמוד מסמך; הצילום החדש יחליף רק לאחר אישור"
                      capture={PREFLIGHT_CAMERA_CAPTURE}
                      disabled={isSelectionLocked}
                      onChange={selectCameraCapture}
                      type="file"
                    />
                  </label>
                  <SourceImagePreview
                    hasSourceImage
                    isVisible={isCameraCapturePreviewVisible}
                    localPreviewUrl={
                      activeLocalPreview?.sourceDocumentRef ===
                      selectedCameraCapture.sourceDocumentRef
                        ? activeLocalPreview.url
                        : null
                    }
                    onToggle={() =>
                      toggleSourcePreview(
                        1,
                        selectedCameraCapture.sourceDocumentRef
                      )
                    }
                    pageNumber={1}
                  />
                  <p className="document-preflight__next-step">
                    שלב 3 מתוך 3: לאחר שהצילום ברור, הפעל בדיקת OCR. בדיקת
                    השרת היא הסופית.
                  </p>
                </div>
              ) : (
                <>
                <p>
                  סדר העמודים כאן יקבע את מספרי העמודים בטיוטת ה־OCR. השינוי
                  מקומי בדפדפן בלבד; התמונות אינן נשלחות עד ללחיצה על יצירת
                  הטיוטות.
                </p>
                <ol className="document-preflight__selection-list">
                  {files.map(({ sourceDocumentRef }, index) => (
                    <li className="document-preflight__selection-item" key={sourceDocumentRef}>
                      <span>עמוד {index + 1}</span>
                      <div className="document-preflight__selection-actions">
                        <button
                          aria-label={`העבר את עמוד ${index + 1} למעלה`}
                          className="manual-review__secondary-button"
                          disabled={index === 0}
                          onClick={() => moveSelectedFile(index, index - 1)}
                          type="button"
                        >
                          העבר למעלה
                        </button>
                        <button
                          aria-label={`העבר את עמוד ${index + 1} למטה`}
                          className="manual-review__secondary-button"
                          disabled={index === files.length - 1}
                          onClick={() => moveSelectedFile(index, index + 1)}
                          type="button"
                        >
                          העבר למטה
                        </button>
                        <button
                          aria-label={`הסר את עמוד ${index + 1} מהאצווה`}
                          className="manual-review__secondary-button"
                          onClick={() => removeSelectedFile(index)}
                          type="button"
                        >
                          הסר עמוד
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
                </>
              )
            ) : (
              <p>
                סדר האצווה כבר שימש ליצירת טיוטת OCR. כדי לשנות סדר, בחר אצווה
                חדשה לפני יצירת הטיוטות.
              </p>
            )}
          </section>
        )}
        {pdfFile && (
          <section className="document-preflight__selection">
            <h2>קובץ PDF לפני OCR</h2>
            <p className="document-preflight__selected">
              נבחר קובץ PDF אחד. שמו אינו מוצג או נשמר בתוצאה. העמודים יומרו
              זמנית לעיבוד לפי הסדר המקורי, עד 20 עמודים.
            </p>
          </section>
        )}
        {activity && (
          <p className="document-preflight__progress" role="status">
            {activity.kind === 'batch'
              ? `מעבד תמונה ${activity.current} מתוך ${activity.total}…`
              : activity.kind === 'pdf'
                ? 'ממיר ובודק עמודי PDF…'
              : activity.kind === 'retry'
                ? `מנסה שוב לעמוד ${activity.pageNumber}…`
                : `קורא מחדש את עמוד ${activity.pageNumber}…`}
          </p>
        )}
        {isSubmitting && (
          <p className="document-preflight__selection-locked" role="status">
            הצילום והבחירה נעולים עד לסיום קריאת ה־OCR.
          </p>
        )}
        <button
          className="manual-review__primary-button document-preflight__submit-button"
          type="submit"
          disabled={
            (files.length === 0 && !pdfFile) ||
            isSubmitting ||
            pendingSourceSelection !== null
          }
        >
          {isSubmitting
            ? activity?.kind === 'batch'
              ? 'קורא את התמונות…'
              : activity?.kind === 'pdf'
                ? 'קורא את עמודי ה־PDF…'
              : activity?.kind === 'retry'
                ? 'מנסה שוב…'
                : 'קורא מחדש…'
            : isSingleCameraCaptureReadyToInspect
              ? 'שלב 3 מתוך 3 — בדוק את הצילום ב־OCR'
              : files.length > 0
                ? `צור טיוטות OCR ל־${files.length} תמונות`
                : 'צור טיוטות OCR ל־PDF'}
        </button>
      </form>

      {error && <p className="manual-review__error" role="alert">{error}</p>}

      {outcome && (
        <section className="manual-review__result">
          <h2 ref={resultHeadingRef} tabIndex={-1}>
            טיוטות OCR — נדרשת בדיקה ידנית
          </h2>
          {isCompletedOcrResultReady && (
            <p
              aria-atomic="true"
              className="document-preflight__completion"
              role="status"
            >
              קריאת ה־OCR הסתיימה.{' '}
              {pages.length > 0
                ? `נוצרו ${pages.length} עמודי טיוטה.`
                : 'לא נוצרו טיוטות OCR.'}{' '}
              {failedPages.length > 0 &&
                `${failedPages.length} עמודים דורשים טיפול.`}
            </p>
          )}
          <p className="manual-review__notice">
            אין להשתמש בתוצאה זו כליקוט. בדוק את הברקוד, המק״ט ושלוש עמודות
            הכמות מול המסמך המקורי, ואז הזן במפורש מארזים ובודדים במסך הבדיקה
            הידנית. ודאות ה־OCR היא סימן טכני בלבד ואינה מאשרת נכונות של שדה כלשהו.
          </p>

          {pendingReplacementPages.map((replacementSlot) => {
            const { pageNumber, sourceDocumentRef } = replacementSlot
            const hasSourceImage = files.some(
              (file) => file.sourceDocumentRef === sourceDocumentRef
            )
            const isPreviewVisible =
              previewedSource?.pageNumber === pageNumber &&
              previewedSource.sourceDocumentRef === sourceDocumentRef

            return (
              <div className="document-preflight__failed-page" key={sourceDocumentRef}>
                <h3>עמוד {pageNumber}</h3>
                <p className="document-preflight__issue" role="status">
                  נבחרה תמונה חלופית. הטיוטה הקודמת לעמוד זה הוסרה, והתמונה החדשה
                  לא נשלחה עדיין. אפשר להפעיל OCR מחדש רק בלחיצה מפורשת.
                </p>
                <button
                  className="manual-review__primary-button"
                  disabled={isSubmitting || !hasSourceImage}
                  onClick={() => reprocessReplacementPage(replacementSlot)}
                  type="button"
                >
                  צור טיוטת OCR חדשה לעמוד {pageNumber}
                </button>
                <SourceImageReplacement
                  disabled={isSubmitting}
                  onSelect={(event) => selectReplacementFile(event, replacementSlot)}
                  pageNumber={pageNumber}
                />
                <SourceImagePreview
                  hasSourceImage={hasSourceImage}
                  isVisible={isPreviewVisible}
                  localPreviewUrl={
                    activeLocalPreview?.sourceDocumentRef === sourceDocumentRef
                      ? activeLocalPreview.url
                      : null
                  }
                  onToggle={() => toggleSourcePreview(pageNumber, sourceDocumentRef)}
                  pageNumber={pageNumber}
                />
              </div>
            )
          })}

          {failedPages.map(({ pageNumber, sourceDocumentRef, code }) => {
            const hasSourceImage = files.some(
              (file) => file.sourceDocumentRef === sourceDocumentRef
            )
            const isPreviewVisible =
              previewedSource?.pageNumber === pageNumber &&
              previewedSource.sourceDocumentRef === sourceDocumentRef

            return (
              <div className="document-preflight__failed-page" key={sourceDocumentRef}>
                <p className="document-preflight__issue" role="alert">
                  לא נוצרה טיוטת OCR לעמוד {pageNumber}. {PREFLIGHT_FAILURE_TEXT[code]}
                </p>
                {isRetryablePreflightFailure(code) && (
                  <button
                    className="manual-review__secondary-button"
                    disabled={isSubmitting}
                    onClick={() =>
                      retryFailedPage({ pageNumber, sourceDocumentRef, code })
                    }
                    type="button"
                  >
                    נסה שוב בעמוד {pageNumber}
                  </button>
                )}
                <SourceImageReplacement
                  disabled={isSubmitting}
                  onSelect={(event) =>
                    selectReplacementFile(event, { pageNumber, sourceDocumentRef })
                  }
                  pageNumber={pageNumber}
                />
                <SourceImagePreview
                  hasSourceImage={hasSourceImage}
                  isVisible={isPreviewVisible}
                  localPreviewUrl={
                    activeLocalPreview?.sourceDocumentRef === sourceDocumentRef
                      ? activeLocalPreview.url
                      : null
                  }
                  onToggle={() => toggleSourcePreview(pageNumber, sourceDocumentRef)}
                  pageNumber={pageNumber}
                />
              </div>
            )
          })}

          {pages.map(({ page, sourceDocumentRef }) => {
            const isPdfPage = pdfPageSourceRefs.includes(sourceDocumentRef)
            const hasSourceImage = files.some(
              (file) => file.sourceDocumentRef === sourceDocumentRef
            )
            const isPreviewVisible =
              previewedSource?.pageNumber === page.pageNumber &&
              previewedSource.sourceDocumentRef === sourceDocumentRef

            return (
              <div className="document-preflight__page" key={sourceDocumentRef}>
                <h3>עמוד {page.pageNumber}</h3>
                {page.issues.map((issue) => (
                  <p className="document-preflight__issue" key={issue.code}>
                    {ISSUE_TEXT[issue.code]}
                  </p>
                ))}
                {isPdfPage ? (
                  <p className="document-preflight__selected">
                    זהו עמוד מתוך PDF. כדי להחליף אותו, בחר קובץ PDF מתוקן חדש
                    והפעל את הבדיקה מחדש; עמוד PDF אינו מוחלף בצילום בודד.
                  </p>
                ) : (
                  <SourceImageReplacement
                    disabled={isSubmitting}
                    onSelect={(event) =>
                      selectReplacementFile(event, {
                        pageNumber: page.pageNumber,
                        sourceDocumentRef,
                      })
                    }
                    pageNumber={page.pageNumber}
                  />
                )}

                <div
                  className={
                    isPreviewVisible
                      ? 'document-preflight__review-layout document-preflight__review-layout--with-preview'
                      : 'document-preflight__review-layout'
                  }
                >
                  {!isPdfPage && (
                    <SourceImagePreview
                      hasSourceImage={hasSourceImage}
                      isVisible={isPreviewVisible}
                      localPreviewUrl={
                        activeLocalPreview?.sourceDocumentRef === sourceDocumentRef
                          ? activeLocalPreview.url
                          : null
                      }
                      onToggle={() =>
                        toggleSourcePreview(page.pageNumber, sourceDocumentRef)
                      }
                      pageNumber={page.pageNumber}
                    />
                  )}

                  {page.rows.length > 0 && (
                    <div className="manual-review__table-wrapper document-preflight__table-wrapper">
                      <table className="document-preflight__ocr-table">
                        <caption className="document-preflight__ocr-table-caption document-preflight__sr-only">
                          תוצאות OCR לעמוד {page.pageNumber}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">להעברה</th>
                            <th scope="col">עמוד</th>
                            <th scope="col">שורת מקור</th>
                            <th scope="col">מק״ט</th>
                            <th scope="col">ברקוד</th>
                            <th scope="col">שם פריט</th>
                            <th scope="col">בדיקות OCR</th>
                            <th scope="col">כמות מארזים</th>
                            <th scope="col">כמות באריזה</th>
                            <th scope="col">כמות בודדים</th>
                            <th scope="col">ודאות OCR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {page.rows.map((row) => {
                            const key = rowKey(page.pageNumber, row)
                            const transferable = canTransferRow(row, sourceDocumentRef)
                            const transferBlockReason = ocrManualReviewHandoffBlockReason({
                              row,
                              sourceDocumentRef,
                            })

                            return (
                              <tr key={row.source.parserRowIndex}>
                                <td
                                  className="document-preflight__table-cell--transfer"
                                  data-label="להעברה"
                                >
                                  <div className="document-preflight__cell-value">
                                    {transferable ? (
                                      <label className="document-preflight__transfer-control">
                                        <input
                                          checked={selectedRowKeys[key] ?? false}
                                          onChange={(event) =>
                                            toggleRowSelection(key, event.target.checked)
                                          }
                                          type="checkbox"
                                        />
                                        <span className="document-preflight__sr-only">
                                          העבר עמוד {page.pageNumber}, שורת מקור{' '}
                                          {row.source.printedRowNumber ??
                                            row.source.parserRowIndex}
                                        </span>
                                      </label>
                                    ) : (
                                      HANDOFF_BLOCK_REASON_TEXT[
                                        transferBlockReason ?? 'SOURCE_NOT_TRACEABLE'
                                      ]
                                    )}
                                  </div>
                                </td>
                                <td data-label="עמוד">
                                  <div className="document-preflight__cell-value">
                                    {page.pageNumber}
                                  </div>
                                </td>
                                <td data-label="שורת מקור">
                                  <div className="document-preflight__cell-value">
                                    {row.source.printedRowNumber ?? row.source.parserRowIndex}
                                  </div>
                                </td>
                                <td
                                  className="document-preflight__identifier-cell"
                                  data-label="מק״ט"
                                >
                                  <div className="document-preflight__cell-value">
                                    <span dir="ltr">{row.sku ?? 'לא זוהה'}</span>
                                  </div>
                                </td>
                                <td
                                  className="document-preflight__identifier-cell"
                                  data-label="ברקוד"
                                >
                                  <div className="document-preflight__cell-value">
                                    <span dir="ltr">{row.barcode ?? 'לא זוהה'}</span>
                                  </div>
                                </td>
                                <td data-label="שם פריט">
                                  <div className="document-preflight__cell-value">
                                    {row.productName ?? 'לא זוהה'}
                                    <details className="document-preflight__trace">
                                      <summary>טקסט מקור</summary>
                                      <span>{row.traceText}</span>
                                    </details>
                                  </div>
                                </td>
                                <td data-label="בדיקות OCR">
                                  <div className="document-preflight__cell-value">
                                    {row.issues.length > 0 ? (
                                      <ul className="document-preflight__row-issues">
                                        {row.issues.map((issue, issueIndex) => (
                                          <li
                                            key={`${issue.code}-${issue.field ?? 'row'}-${issueIndex}`}
                                          >
                                            {documentPreflightRowIssueText(issue)}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </td>
                                <td data-label="כמות מארזים">
                                  <div className="document-preflight__cell-value">
                                    {displayQuantity(row.sourceQuantities.caseQuantity)}
                                  </div>
                                </td>
                                <td data-label="כמות באריזה">
                                  <div className="document-preflight__cell-value">
                                    {displayQuantity(row.sourceQuantities.unitsPerCase)}
                                  </div>
                                </td>
                                <td data-label="כמות בודדים">
                                  <div className="document-preflight__cell-value">
                                    {displayQuantity(row.sourceQuantities.totalUnits)}
                                  </div>
                                </td>
                                <td data-label="ודאות OCR">
                                  <div className="document-preflight__cell-value">
                                    {Math.round(row.confidence)}%
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div className="document-preflight__handoff">
            <label>
              <input
                checked={hasConfirmedSourceCheck}
                disabled={selectedRows.length === 0 || isSubmitting}
                onChange={(event) => setHasConfirmedSourceCheck(event.target.checked)}
                type="checkbox"
              />
              בדקתי מול המסמך את המזהים ואת שלוש כמויות המקור בכל השורות שנבחרו.
            </label>
            <button
              className="manual-review__primary-button"
              disabled={
                isSubmitting || selectedRows.length === 0 || !hasConfirmedSourceCheck
              }
              onClick={transferToManualReview}
              type="button"
            >
              העבר {selectedRows.length} שורות לטיוטת בדיקה ידנית
            </button>
            <p>
              ההעברה זמנית בדפדפן בלבד. המארזים והבודדים יישארו ריקים במסך
              הבדיקה, ולא יישלחו אוטומטית לשירות.
            </p>
          </div>

          <Link className="manual-review__primary-button" href="/review">
            עבור להזנה ידנית ללא העברת טיוטה
          </Link>
        </section>
      )}
    </div>
  )
}
