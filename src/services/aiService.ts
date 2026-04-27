import { companyDocuments } from '../data/documents'
import { getAllPDFsText } from '../utils/pdfExtractor'

interface AIResponse {
  text: string
  sources: string[]
}

let documentCache: Record<string, string> | null = null

async function loadDocumentCache(): Promise<Record<string, string>> {
  if (documentCache) return documentCache

  const docIds = companyDocuments.map(d => d.id)
  const texts = await getAllPDFsText(docIds, docId => {
    const doc = companyDocuments.find(d => d.id === docId)
    return doc ? doc.filePath : undefined
  })

  documentCache = texts
  return documentCache
}

export async function queryAI(question: string): Promise<AIResponse> {
  const documents = await loadDocumentCache()

  // Combine all document text
  let allDocsText = ''
  const docTitles: string[] = []

  for (const doc of companyDocuments) {
    const text = documents[doc.id]
    if (text && text.trim().length > 0) {
      docTitles.push(doc.title)
      allDocsText += `\n\n=== ${doc.title} (${doc.category}) ===\n${text}`
    }
  }

  if (allDocsText.trim().length === 0) {
    throw new Error('No documents loaded. Check that PDFs exist in public/docs/')
  }

  const functionUrl = import.meta.env.VITE_SUPABASE_FUNCTION_URL

  if (!functionUrl) {
    throw new Error('Supabase function URL not configured. Check VITE_SUPABASE_FUNCTION_URL in .env')
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      documentContext: allDocsText,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to query AI')
  }

  const data = await response.json()

  // Extract which documents Claude mentioned
  const mentionedSources: string[] = []
  for (const title of docTitles) {
    if (data.text.includes(title)) {
      mentionedSources.push(title)
    }
  }

  return {
    text: data.text,
    sources: mentionedSources,
  }
}

export async function clearDocumentCache(): Promise<void> {
  documentCache = null
}
