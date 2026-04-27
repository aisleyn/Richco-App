import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Bot, FileText, Play, ChevronRight, RotateCcw, AlertCircle } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { aiTypingMessages } from '../data/mockData'
import { companyDocuments } from '../data/documents'
import { queryAI } from '../services/aiService'
import type { ChatMessage } from '../types'

const docs = companyDocuments

const videos: { id: string; title: string; duration: string; thumbnail: string }[] = []

const suggestedQuestions = [
  'What do I do if its hot outside?',
  'How much water should I drink while working?',
  'What are the signs of heat illness?',
  'When do I get to take a break?',
]

function TypingIndicator({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-blue-600" />
      </div>
      <div className="bg-bg-elevated rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
        <p className="text-slate-400 text-xs italic mb-2">{message}</p>
        <div className="flex items-center gap-1">
          {[0, 0.15, 0.3].map(delay => (
            <motion.div
              key={delay}
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay }}
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
            />
          ))}
        </div>
      </div>
    </div>
  )
}


export function AIHelpScreen(_props: { onNavigate?: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'docs'>('chat')
  const { chatMessages, addChatMessage, clearChat } = useAppStore()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingMsg, setTypingMsg] = useState('')
  const [typingMsgIdx, setTypingMsgIdx] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  useEffect(() => {
    if (!isTyping) return
    const msgs = aiTypingMessages
    const id = setInterval(() => {
      setTypingMsgIdx(i => (i + 1) % msgs.length)
      setTypingMsg(msgs[typingMsgIdx])
    }, 900)
    return () => clearInterval(id)
  }, [isTyping, typingMsgIdx])

  async function handleSend(text?: string) {
    const q = (text ?? input).trim()
    if (!q) return
    setInput('')

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: q, timestamp: Date.now() }
    addChatMessage(userMsg)

    setIsTyping(true)
    setTypingMsg(aiTypingMessages[0])

    const typingIdx = setInterval(() => {
      setTypingMsgIdx(i => (i + 1) % aiTypingMessages.length)
    }, 900)

    try {
      const response = await queryAI(q)

      clearInterval(typingIdx)
      setIsTyping(false)

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        sources: response.sources,
      }
      addChatMessage(aiMsg)
    } catch (error) {
      clearInterval(typingIdx)
      setIsTyping(false)

      const errorMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `Error: Unable to process your question. Please check that your API key is configured correctly. ${error instanceof Error ? error.message : ''}`,
        timestamp: Date.now(),
        sources: [],
      }
      addChatMessage(errorMsg)
    }
  }

  return (
    <AppLayout noPad>
      <div className="pt-14 px-4 flex items-center justify-between">
        <div>
          <h1 className="text-slate-800 text-xl md:text-2xl font-bold">AI Help</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs">Online · Richco Knowledge Base</span>
          </div>
        </div>
        <button onClick={clearChat} className="w-9 h-9 rounded-full bg-bg-surface flex items-center justify-center border border-slate-200">
          <RotateCcw size={15} className="text-slate-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-4">
        {(['chat', 'docs'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition-colors ${activeTab === t ? 'bg-blue-600 text-slate-900' : 'bg-bg-surface text-slate-400 border border-white/10'}`}
          >
            {t === 'docs' ? 'Documents' : 'Chat'}
          </button>
        ))}
      </div>

      {activeTab === 'chat' ? (
        <div className="flex flex-col h-[calc(100vh-11rem)]">
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center text-center pt-6 pb-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-600/20 flex items-center justify-center mb-4">
                  <Bot size={28} className="text-blue-600" />
                </div>
                <p className="text-slate-800 font-semibold mb-1">Richco AI Assistant</p>
                <p className="text-slate-400 text-sm max-w-xs">Ask me anything about safety procedures, OSHA regulations, or company policies.</p>

                <div className="mt-6 w-full space-y-2">
                  {suggestedQuestions.map((q, i) => (
                    <motion.button
                      key={q}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => handleSend(q)}
                      className="w-full text-left bg-bg-surface border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between group active:bg-bg-elevated transition-colors"
                    >
                      <span className="text-slate-300 text-sm">{q}</span>
                      <ChevronRight size={14} className="text-slate-600 group-active:text-blue-600 transition-colors shrink-0 ml-2" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map(msg => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-blue-600 text-slate-900 rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm font-medium">{msg.content}</p>
                    </div>
                  </div>
                )
              }
              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-bg-elevated rounded-2xl rounded-bl-md px-4 py-3">
                      <p className="text-slate-900 text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                    </div>
                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
    <div className="space-y-1">
      {msg.sources.map((s, i) => {
        const doc = docs.find(d => d.title === s)
        return (
          <button
            key={i}
            onClick={() => doc && window.open(doc.filePath, '_blank')}
            disabled={!doc}
            className="w-full text-left flex items-center gap-2 bg-bg-surface border border-slate-200
  rounded-lg px-3 py-2 hover:bg-bg-elevated disabled:opacity-50 transition-colors cursor-pointer"
          >
            <FileText size={11} className="text-slate-500 shrink-0" />
            <span className="text-slate-400 text-xs">{s}</span>
            <ChevronRight size={11} className="text-slate-600 shrink-0 ml-auto" />
          </button>
        )
      })}
    </div>
  )}
                    {/* Video card */}
                    {msg.videoCard && (
                      <div className="bg-bg-elevated border border-white/10 rounded-xl overflow-hidden flex items-center gap-3 p-3">
                        <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 relative">
                          <img src={msg.videoCard.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Play size={14} fill="white" className="text-slate-800 ml-0.5" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-800 text-xs font-medium truncate">{msg.videoCard.title}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">{msg.videoCard.duration} · Training Video</p>
                        </div>
                        <Play size={16} className="text-blue-600 shrink-0" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {isTyping && <TypingIndicator message={typingMsg || aiTypingMessages[0]} />}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 pb-4 pt-2 border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2 bg-bg-surface rounded-2xl border border-white/10 px-4 py-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about safety, procedures..."
                className="flex-1 bg-transparent text-slate-800 text-sm placeholder:text-slate-600 outline-none"
              />
              <button className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center shrink-0">
                <Mic size={14} className="text-slate-400" />
              </button>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-full bg-blue-600 disabled:opacity-30 flex items-center justify-center shrink-0 transition-opacity"
              >
                <Send size={13} className="text-slate-900" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Documents tab */
        <div className="px-4 mt-4 pb-6 space-y-6">
          {/* Info banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 mt-4">
            <AlertCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-emerald-900 text-sm font-medium">Documents Available</p>
              <p className="text-emerald-700 text-xs mt-0.5">31 Richco company documents are accessible. Click any document to open and view.</p>
            </div>
          </div>

          {/* Documents by category */}
          {(['Safety', 'HR & Policies', 'Training & Procedures'] as const).map(category => {
            const categoryDocs = docs.filter(d => d.category === category)
            return (
              <div key={category}>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryDocs.map((d, i) => (
                    <motion.button
                      key={d.id}
                      onClick={() => window.open(d.filePath, '_blank')}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="w-full text-left bg-bg-surface border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:bg-bg-elevated active:bg-bg-elevated transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-sm font-medium">{d.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{d.category}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
