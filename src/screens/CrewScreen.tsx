import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronLeft, Send, X, Users } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { mockCrew, mockThreads, mockMessages, currentUser } from '../data/mockData'
import { useAppStore } from '../store/appStore'
import { formatDistanceToNow } from 'date-fns'
import type { CrewMember, MessageThread, Message } from '../types'

const statusConfig = {
  onsite:    { label: 'On Site',   color: 'bg-emerald-400', text: 'text-emerald-400' },
  enroute:   { label: 'En Route',  color: 'bg-amber-400',   text: 'text-amber-400' },
  available: { label: 'Available', color: 'bg-blue-400',    text: 'text-blue-400' },
  off:       { label: 'Off Today', color: 'bg-slate-500',   text: 'text-slate-500' },
}

const roleFilters = ['All', 'Field Crew', 'Supervisor', 'Office', 'Leadership'] as const
type RoleFilter = typeof roleFilters[number]

function roleMatch(member: CrewMember, filter: RoleFilter) {
  if (filter === 'All') return true
  if (filter === 'Field Crew') return member.role === 'field'
  if (filter === 'Supervisor') return member.role === 'supervisor'
  if (filter === 'Office') return member.role === 'admin'
  if (filter === 'Leadership') return member.role === 'ceo' || member.role === 'supervisor'
  return true
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`${color} rounded-full flex items-center justify-center shrink-0 text-white font-bold`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

export function CrewScreen(_props: { onNavigate?: (s: string) => void }) {
  const [tab, setTab] = useState<'directory' | 'messages'>('directory')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All')
  const [messageInput, setMessageInput] = useState('')
  const { setUnreadMessageCount, crewMessages, crewActiveThread, setCrewActiveThread, addCrewMessage } = useAppStore()

  const filtered = mockCrew
    .filter(m => m.id !== currentUser.id)
    .filter(m => roleMatch(m, roleFilter))
    .filter(m => search ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) : true)

  const threads = mockThreads

  function sendMessage() {
    if (!messageInput.trim() || !crewActiveThread) return
    const msg: Message = {
      id: `msg-${Date.now()}`,
      threadId: crewActiveThread,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      body: messageInput.trim(),
      timestamp: Date.now(),
      read: true,
    }
    addCrewMessage(msg)
    setMessageInput('')
  }

  const currentThreadMsgs = crewActiveThread ? (crewMessages[crewActiveThread] ?? []) : []
  const currentThread = threads.find(t => t.id === crewActiveThread)

  return (
    <AppLayout>
      <div className="pt-14">
        {crewActiveThread ? (
          /* Message thread view */
          <div className="flex flex-col h-[calc(100vh-5rem)] -mx-4">
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 pb-4 border-b border-slate-200 shrink-0">
              <button onClick={() => setCrewActiveThread(null)} className="text-brand-amber">
                <ChevronLeft size={22} />
              </button>
              <Avatar name={currentThread?.groupName ?? currentThread?.participantNames[0] ?? ''} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-semibold text-sm truncate">
                  {currentThread?.groupName ?? currentThread?.participantNames[0]}
                </p>
                {currentThread?.isGroup && (
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Users size={10} /> {currentThread.participants.length} members
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {currentThreadMsgs.map(msg => {
                const isMe = msg.senderId === currentUser.id
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!isMe && <Avatar name={msg.senderName} size={28} />}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {!isMe && <p className="text-slate-500 text-[10px] px-1">{msg.senderName}</p>}
                      <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-brand-amber text-slate-900 rounded-br-md' : 'bg-bg-elevated text-white rounded-bl-md'}`}>
                        <p className="text-sm">{msg.body}</p>
                      </div>
                      <p className="text-slate-600 text-[10px] px-1">{formatDistanceToNow(msg.timestamp, { addSuffix: true })}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2 bg-bg-surface rounded-2xl border border-white/10 px-4 py-2.5">
                <input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-slate-800 text-sm placeholder:text-slate-600 outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="w-8 h-8 rounded-full bg-brand-amber disabled:opacity-30 flex items-center justify-center shrink-0 transition-opacity"
                >
                  <Send size={14} className="text-slate-900" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-slate-900 text-2xl font-bold">Crew</h1>
              <div className="flex bg-bg-surface rounded-xl border border-slate-200 p-0.5">
                {(['directory', 'messages'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-brand-amber text-slate-900' : 'text-slate-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'directory' ? (
              <>
                {/* Search */}
                <div className="relative mb-4">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search crew..."
                    className="w-full bg-bg-surface border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-slate-600"
                  />
                  {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-500" /></button>}
                </div>

                {/* Role filters */}
                <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
                  {roleFilters.map(f => (
                    <button
                      key={f}
                      onClick={() => setRoleFilter(f)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${roleFilter === f ? 'bg-brand-amber text-slate-900' : 'bg-bg-surface text-slate-400 border border-white/10'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Crew list */}
                <div className="space-y-2">
                  {filtered.map((member, i) => {
                    const sc = statusConfig[member.status]
                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="bg-bg-surface rounded-xl border border-slate-200 p-3.5 flex items-center gap-3"
                      >
                        <div className="relative">
                          <Avatar name={`${member.firstName} ${member.lastName}`} size={42} />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${sc.color} border-2 border-bg-base`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-800 font-medium text-sm">{member.firstName} {member.lastName}</p>
                          <p className="text-slate-500 text-xs">{member.roleLabel}</p>
                          {member.currentSite && <p className="text-slate-600 text-[10px] truncate mt-0.5">{member.currentSite}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-semibold ${sc.text}`}>{sc.label}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </>
            ) : (
              /* Messages tab */
              <div className="space-y-2">
                {threads.map((thread, i) => (
                  <motion.button
                    key={thread.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => { setCrewActiveThread(thread.id); setUnreadMessageCount(Math.max(0, mockThreads.reduce((a, t) => a + t.unreadCount, 0) - thread.unreadCount)) }}
                    className="w-full text-left bg-bg-surface rounded-xl border border-slate-200 p-4 flex items-center gap-3 active:bg-bg-elevated transition-colors"
                  >
                    <Avatar name={thread.groupName ?? thread.participantNames[0]} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${thread.unreadCount > 0 ? 'text-white' : 'text-slate-300'}`}>
                        {thread.groupName ?? thread.participantNames[0]}
                      </p>
                      <p className="text-slate-500 text-xs truncate mt-0.5">{thread.lastMessage}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <p className="text-slate-600 text-[10px]">{formatDistanceToNow(thread.lastTimestamp, { addSuffix: false })}</p>
                      {thread.unreadCount > 0 && (
                        <span className="bg-brand-amber text-slate-900 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
