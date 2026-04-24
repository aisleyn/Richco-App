import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Bot, FileText, Play, ChevronRight, RotateCcw } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { aiTypingMessages } from '../data/mockData'
import type { ChatMessage } from '../types'

const docs = [
  { id: 'd1', title: 'Site Safety Manual', category: 'Safety', pages: 48 },
  { id: 'd2', title: 'OSHA 1926 Construction Standards', category: 'Regulations', pages: 312 },
  { id: 'd3', title: 'Richco Employee Handbook', category: 'HR', pages: 64 },
  { id: 'd4', title: 'Concrete Work Procedures', category: 'Procedures', pages: 22 },
  { id: 'd5', title: 'PPE Requirements Guide', category: 'Safety', pages: 18 },
  { id: 'd6', title: 'Working at Heights Procedure', category: 'Safety', pages: 28 },
  { id: 'd7', title: 'Excavation & Trenching SOP', category: 'Procedures', pages: 34 },
  { id: 'd8', title: 'New Employee Onboarding Guide', category: 'HR', pages: 42 },
]

const videos = [
  { id: 'v1', title: 'Trench Safety Briefing', duration: '8:42', thumbnail: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200' },
  { id: 'v2', title: 'PPE Inspection Walkthrough', duration: '5:18', thumbnail: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=200' },
  { id: 'v3', title: 'Concrete Pour Best Practices', duration: '12:05', thumbnail: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200' },
]

const suggestedQuestions = [
  'What PPE is required for active sites?',
  'How long can I work before a mandatory break?',
  'What are the heat advisory protocols?',
  'When do I need a spotter for equipment?',
]

function TypingIndicator({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-brand-amber/20 border border-brand-amber/30 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-brand-amber" />
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

const mockResponses: Record<string, { text: string; sources: string[]; video?: typeof videos[0] }> = {
  'What PPE is required for active sites?': {
    text: 'For active sites, Richco requires the following PPE per the Site Safety Manual and OSHA 1926.651:\n\n• Hard hat (Class E minimum)\n• High-visibility vest (ANSI/ISEA Class 2)\n• Safety glasses or face shield\n• Steel-toed boots (CSA Grade 1)\n• Cut-resistant gloves when handling rebar\n• Hearing protection when operating equipment\n\nAdditionally, a competent person must inspect the site before each shift and after any rain event. Never enter an unprotected site.',
    sources: ['Richco Site Safety Manual — Section 7.3', 'OSHA 1926.651 — Excavations'],
    video: videos[0],
  },
  'How long can I work before a mandatory break?': {
    text: 'Per Richco company policy and applicable BC labour regulations:\n\n• After 4 consecutive hours: 30-minute unpaid meal break required\n• After 5 hours: mandatory 10-minute paid rest break\n• Working more than 8 hours: additional 30-minute break required\n\nThe app will send you an automatic reminder at the 4-hour mark if you are clocked in with no break recorded. Supervisors are notified of missed breaks automatically. All break times are tracked separately from work hours in your timesheet.',
    sources: ['Richco Employee Handbook — Section 4.2', 'BC Employment Standards Act — Section 32'],
  },
  'What are the heat advisory protocols?': {
    text: 'When temperatures exceed 29°C (84°F) on site, Richco activates the following heat safety protocol:\n\n• Mandatory 10-minute shade breaks every hour\n• Cool water available within 50 feet of all workers at all times\n• Buddy system — crew must check on each other every 30 minutes\n\nAt 35°C (95°F) or above, site supervisors have authority to delay non-essential outdoor work. Signs of heat illness — dizziness, nausea, confusion — require immediate first aid response and reporting.',
    sources: ['Richco Site Safety Manual — Section 9.1', 'WorkSafeBC Heat Stress Guidelines'],
  },
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

    await new Promise(r => setTimeout(r, 2200 + Math.random() * 1000))
    setIsTyping(false)

    const response = mockResponses[q] ?? {
      text: `I've searched the Richco safety manual, OSHA regulations, and company procedures for information about "${q}". For this specific query, please consult your site supervisor or refer directly to the relevant procedure document. If you need this added to the knowledge base, contact the safety team.`,
      sources: ['Richco Site Safety Manual', 'OSHA Construction Standards'],
    }

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: response.text,
      timestamp: Date.now(),
      sources: response.sources,
      videoCard: response.video ? { title: response.video.title, duration: response.video.duration, thumbnail: response.video.thumbnail } : undefined,
    }
    addChatMessage(aiMsg)
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
            className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition-colors ${activeTab === t ? 'bg-brand-amber text-slate-900' : 'bg-bg-surface text-slate-400 border border-white/10'}`}
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
                <div className="w-16 h-16 rounded-2xl bg-brand-amber/15 border border-brand-amber/20 flex items-center justify-center mb-4">
                  <Bot size={28} className="text-brand-amber" />
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
                      <ChevronRight size={14} className="text-slate-600 group-active:text-brand-amber transition-colors shrink-0 ml-2" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map(msg => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-brand-amber text-slate-900 rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm font-medium">{msg.content}</p>
                    </div>
                  </div>
                )
              }
              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-amber/20 border border-brand-amber/30 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-brand-amber" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-bg-elevated rounded-2xl rounded-bl-md px-4 py-3">
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                    </div>
                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="space-y-1">
                        {msg.sources.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 bg-bg-surface border border-slate-200 rounded-lg px-3 py-2">
                            <FileText size={11} className="text-slate-500 shrink-0" />
                            <span className="text-slate-400 text-xs">{s}</span>
                          </div>
                        ))}
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
                        <Play size={16} className="text-brand-amber shrink-0" />
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
                className="w-8 h-8 rounded-full bg-brand-amber disabled:opacity-30 flex items-center justify-center shrink-0 transition-opacity"
              >
                <Send size={13} className="text-slate-900" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Documents tab */
        <div className="px-4 mt-4 pb-6 space-y-5">
          {/* Training videos */}
          <div>
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Training Videos</h3>
            <div className="space-y-2">
              {videos.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-bg-surface border border-slate-200 rounded-xl overflow-hidden flex items-center gap-3 p-3 active:bg-bg-elevated transition-colors"
                >
                  <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 relative">
                    <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play size={16} fill="white" className="text-slate-800 ml-0.5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm font-medium truncate">{v.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{v.duration} · Training</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Procedure Documents</h3>
            <div className="space-y-2">
              {docs.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-bg-surface border border-slate-200 rounded-xl p-4 flex items-center gap-3 active:bg-bg-elevated transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-amber/15 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-brand-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm font-medium truncate">{d.title}</p>
                    <p className="text-slate-500 text-xs">{d.category} · {d.pages} pages</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
