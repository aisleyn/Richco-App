/**
 * Document Preview Service
 * Handles document viewing and conversion for the AI assistant
 */

interface DocumentPreviewOptions {
  url: string
  fileName: string
  fileType: string
}

/**
 * Get preview URL for a document
 * Supports PDF, DOCX, and images
 */
export function getDocumentPreviewUrl(options: DocumentPreviewOptions): string {
  const { url, fileName, fileType } = options

  // For PDFs, use directly
  if (fileType.includes('pdf')) {
    return url
  }

  // For images, use directly
  if (fileType.startsWith('image/')) {
    return url
  }

  // For Word docs, use Microsoft Office Online viewer
  if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    // Microsoft Office Online viewer
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
  }

  // Fallback: return original URL
  return url
}

/**
 * Check if file type is previewable
 */
export function isPreviewable(fileType: string, fileName: string): boolean {
  const previewableTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]

  if (previewableTypes.some(type => fileType.includes(type))) {
    return true
  }

  const previewableExtensions = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png', '.webp']
  return previewableExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
}

/**
 * Convert DOCX to PDF using CloudConvert API
 * Note: Requires CLOUDCONVERT_API_KEY environment variable
 * Free tier: 25 API calls/day
 */
export async function convertDocxToPdf(fileUrl: string): Promise<string | null> {
  try {
    // This would require backend implementation
    // For now, use Microsoft Office Online viewer as fallback
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
  } catch (err) {
    console.error('[DocumentPreview] Conversion failed:', err)
    return null
  }
}

/**
 * Extract text from document for AI processing
 * This is a placeholder - actual implementation would need backend
 */
export async function extractDocumentText(fileUrl: string, fileType: string): Promise<string> {
  try {
    if (fileType.includes('pdf') || fileType.includes('text')) {
      // For PDFs and text files, we'd need a backend service
      // to extract text (pdfjs-dist, pdf-lib, etc.)
      console.log('[DocumentPreview] Text extraction for AI: would need backend')
      return 'Document content (full text extraction available with backend)'
    }

    if (fileType.includes('word')) {
      // For DOCX files, similar story
      console.log('[DocumentPreview] DOCX text extraction: would need backend')
      return 'Document content (DOCX extraction available with backend)'
    }

    return ''
  } catch (err) {
    console.error('[DocumentPreview] Text extraction failed:', err)
    return ''
  }
}

/**
 * Prepare document for AI assistant context
 * Returns preview info and optionally extracted text
 */
export interface DocumentForAI {
  fileName: string
  fileType: string
  previewUrl: string
  textContent?: string
  fileSize: number
}

export async function prepareDocumentForAI(
  fileUrl: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  includeText: boolean = false
): Promise<DocumentForAI> {
  const previewUrl = getDocumentPreviewUrl({ url: fileUrl, fileName, fileType })

  let textContent: string | undefined
  if (includeText && isPreviewable(fileType, fileName)) {
    textContent = await extractDocumentText(fileUrl, fileType)
  }

  return {
    fileName,
    fileType,
    previewUrl,
    textContent,
    fileSize,
  }
}
