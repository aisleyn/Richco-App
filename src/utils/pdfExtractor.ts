import * as pdfjsLib from 'pdfjs-dist'

const CACHE_KEY = 'richco-pdf-cache'
const CACHE_VERSION = 1

interface CachedPDF {
  docId: string
  text: string
  extractedAt: number
}

interface PDFCache {
  version: number
  pdfs: CachedPDF[]
  extractedAt: number
}

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export async function extractPDFText(filePath: string): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument(filePath).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }

    return fullText
  } catch (error) {
    console.error(`Failed to extract PDF from ${filePath}:`, error)
    return ''
  }
}

export async function getAllPDFsText(docIds: string[], getFilePath: (id: string) => string | undefined): Promise<Record<string, string>> {
  const cached = getCachedPDFs()
  const result: Record<string, string> = {}
  const toExtract: string[] = []

  for (const docId of docIds) {
    const cachedPdf = cached.pdfs.find(p => p.docId === docId)
    if (cachedPdf) {
      result[docId] = cachedPdf.text
    } else {
      toExtract.push(docId)
    }
  }

  if (toExtract.length > 0) {
    for (const docId of toExtract) {
      const filePath = getFilePath(docId)
      if (filePath) {
        const text = await extractPDFText(filePath)
        result[docId] = text
      }
    }

    cached.pdfs.push(
      ...toExtract.map(docId => ({
        docId,
        text: result[docId] || '',
        extractedAt: Date.now(),
      }))
    )
    cached.extractedAt = Date.now()
    saveCachedPDFs(cached)
  }

  return result
}

function getCachedPDFs(): PDFCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return { version: CACHE_VERSION, pdfs: [], extractedAt: 0 }
    const parsed = JSON.parse(cached)
    if (parsed.version !== CACHE_VERSION) return { version: CACHE_VERSION, pdfs: [], extractedAt: 0 }
    return parsed
  } catch {
    return { version: CACHE_VERSION, pdfs: [], extractedAt: 0 }
  }
}

function saveCachedPDFs(cache: PDFCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Failed to save PDF cache:', error)
  }
}

export function clearPDFCache(): void {
  localStorage.removeItem(CACHE_KEY)
}
