import { CompanyDocument } from '../data/documents'

  interface RetrievedChunk {
    docId: string
    docTitle: string
    category: string
    text: string
    startIdx: number
  }

  export function retrieveRelevantChunks(
    question: string,
    documents: Record<string, { doc: CompanyDocument; text: string }>,
    maxChunks: number = 5
  ): RetrievedChunk[] {
    const chunks: RetrievedChunk[] = []

    // Collect all chunks from all documents with relevance scoring
    for (const [docId, { doc, text }] of Object.entries(documents)) {
      if (!text || text.trim().length === 0) continue

      // Split into ~1000 char chunks
      const chunkSize = 1000
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunkText = text.slice(i, i + chunkSize)
        const score = scoreRelevance(question, chunkText, doc.category)

        if (score > 0) {
          chunks.push({
            docId,
            docTitle: doc.title,
            category: doc.category,
            text: chunkText,
            startIdx: i,
          })
        }
      }
    }

    // Sort by score (highest first) and return top chunks
    chunks.sort((a, b) => scoreRelevance(question, b.text, '') - scoreRelevance(question, a.text, ''))
    return chunks.slice(0, maxChunks)
  }

  function scoreRelevance(question: string, chunk: string, category: string): number {
    const questionLower = question.toLowerCase()
    const chunkLower = chunk.toLowerCase()

    let score = 0

    // Simple word overlap scoring
    const questionWords = questionLower.split(/\s+/).filter(w => w.length > 3)
    for (const word of questionWords) {
      if (chunkLower.includes(word)) {
        score += 10
      }
    }

    // Boost score if chunk is from relevant category
    if (category.includes('Safety') && (questionLower.includes('safe') || questionLower.includes('procedure'))) {
      score += 5
    }
    if (category.includes('HR') && (questionLower.includes('policy') || questionLower.includes('hr') || questionLower.includes('employee'))) {
      score += 5
    }

    // Length bonus (prefer longer chunks with more content)
    if (chunk.length > 500) score += 3

    return score
  }

  export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
      return 'No specific documents found in knowledge base.'
    }

    return chunks
      .map((chunk, idx) => `[Document ${idx + 1}: ${chunk.docTitle} (${chunk.category})]\n${chunk.text}\n`)
      .join('\n---\n\n')
  }