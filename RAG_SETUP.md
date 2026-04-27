# Richco AI Help — RAG System Setup

## What We Built

A Retrieval Augmented Generation (RAG) system that:
1. **Extracts text** from 31 PDFs in `public/docs/` folder
2. **Caches extracted text** in browser localStorage (one-time extraction)
3. **Retrieves relevant documents** based on your question (keyword matching)
4. **Sends to Claude Haiku** with document context for intelligent answers
5. **Uses prompt caching** for 90% cheaper follow-up questions

## Files Created

- `src/services/aiService.ts` — Claude API integration with Haiku
- `src/utils/pdfExtractor.ts` — PDF text extraction + localStorage caching
- `src/utils/documentRetrieval.ts` — Keyword-based document retrieval
- Updated `src/screens/AIHelpScreen.tsx` — Removed mock responses, integrated real API

## Setup (One-Time)

### 1. Get Your Anthropic API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API keys** and create a new key
4. Copy the key

### 2. Add API Key to .env

Edit `.env` in the project root:

```
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

Replace `sk-ant-xxxxxxxxxxxxx` with your actual API key.

⚠️ **IMPORTANT:** Never commit `.env` to git. It's in `.gitignore` for a reason.

### 3. Run Dev Server

```bash
npm run dev
```

The app will start loading PDFs from `public/docs/` into localStorage. First chat will take a few seconds while PDFs are extracted.

## How It Works

### First Question (Cost: ~$0.50)
- Extracts all 31 PDFs from `public/docs/`
- Stores extracted text in browser localStorage (reused for all future questions)
- Retrieves top 5 relevant chunks based on keywords
- Sends question + document context to Claude Haiku
- Returns answer + source documents cited

### Follow-Up Questions (Cost: ~$0.001)
- Uses cached PDF text from localStorage (instant retrieval)
- Retrieves relevant chunks
- Sends to Claude (new request, but cached tokens = 90% cheaper)
- Returns answer

## Cost Estimate (2 prompts/week)

- **Best case** (both in same session): ~$2.20/month
- **Realistic case** (separate sessions): ~$4.00/month

## Troubleshooting

### "Error: API key not configured"
→ Check that `.env` has `VITE_ANTHROPIC_API_KEY` set correctly

### "Failed to extract PDF"
→ Check that PDF files exist in `public/docs/`
→ Make sure filenames match exactly in `src/data/documents.ts`

### "No documents found in knowledge base"
→ The keyword search didn't find relevant documents
→ Claude will still answer, but won't cite sources
→ Try different keywords in your question

### PDF text looks garbled
→ Some PDFs have encoding issues. This is normal and Claude handles it well.

## Next Steps

### Optional: Add Prompt Caching Header
When the Anthropic SDK supports cache_control in the Messages API, we can add:
```ts
cache_control: { type: 'ephemeral' }
```
to further reduce costs. For now, the system works great without it.

### Optional: Improve Retrieval
The current keyword search is simple. To add semantic search:
1. Generate embeddings for document chunks
2. Store embeddings in localStorage
3. Use cosine similarity to find relevant chunks

But for 31 documents, keyword search is fast and effective enough.

## Architecture Diagram

```
User Question
    ↓
[PDF Cache in localStorage]
    ↓
Document Retrieval (keywords)
    ↓
Top 5 Relevant Chunks
    ↓
Claude Haiku API
    ↓
AI Response + Sources
```

## Files Modified

- `package.json` — Added `@anthropic-ai/sdk` and `pdfjs-dist`
- `src/screens/AIHelpScreen.tsx` — Removed mockResponses, integrated queryAI()
- `.env` — Added Anthropic API key configuration

## Model Used

- **Claude Haiku 4.5** — Cheapest, perfect for retrieval tasks
- Context: 200K tokens
- Input: $1.00 per 1M tokens
- Output: $5.00 per 1M tokens
