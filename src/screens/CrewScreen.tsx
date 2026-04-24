import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronLeft, Send, X, Users, Plus, Edit2, MessageCircle } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { currentUser } from '../data/mockData'
import { useAppStore } from '../store/appStore'
import { formatDistanceToNow } from 'date-fns'
import { getAllCrew, isUserAdmin, initializeCrew } from '../services/crew'
import { AddCrewModal } from '../components/crew/AddCrewModal'
import { EditCrewModal } from '../components/crew/EditCrewModal'
import { EmployeeProfileSheet } from '../components/crew/EmployeeProfileSheet'
import type { Message } from '../types'
import type { StoredCrewMember } from '../services/crew'

const CREW_MESSAGES_KEY = 'richco-crew-messages'

function getThreadId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-')
}

function getThreadMessages(threadId: string): Message[] {
  try {
    const stored = localStorage.getItem(CREW_MESSAGES_KEY)
    const allMessages = stored ? JSON.parse(stored) : {}
    return allMessages[threadId] ?? []
  } catch {
    return []
  }
}

function saveThreadMessage(threadId: string, message: Message) {
  try {
    const stored = localStorage.getItem(CREW_MESSAGES_KEY)
    const allMessages = stored ? JSON.parse(stored) : {}
    if (!allMessages[threadId]) {
      allMessages[threadId] = []
    }
    allMessages[threadId].push(message)
    localStorage.setItem(CREW_MESSAGES_KEY, JSON.stringify(allMessages))
  } catch (err) {
    console.error('[Messages] Failed to save message:', err)
  }
}

const statusConfig = {
  online:    { label: 'Online',    color: 'bg-emerald-400', text: 'text-emerald-400' },
  onsite:    { label: 'On Site',   color: 'bg-emerald-400', text: 'text-emerald-400' },
  enroute:   { label: 'En Route',  color: 'bg-amber-400',   text: 'text-amber-400' },
  available: { label: 'Available', color: 'bg-blue-400',    text: 'text-blue-400' },
  off:       { label: 'Off Today', color: 'bg-slate-500',   text: 'text-slate-500' },
}

function getOnlineStatus(member: StoredCrewMember): { label: string; color: string; text: string } {
  if (member.clockedInAt) {
    return statusConfig.online
  }
  return statusConfig[member.status]
}

const roleFilters = ['All', 'Field Crew', 'Supervisor', 'Office', 'Leadership'] as const
type RoleFilter = typeof roleFilters[number]

function roleMatch(member: StoredCrewMember, filter: RoleFilter) {
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
    <div className={`${color} rounded-full flex items-center justify-center shrink-0 text-slate-800 font-bold`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

export function CrewScreen(_props: { onNavigate?: (s: string) => void }) {
  const [tab, setTab] = useState<'directory' | 'messages'>('directory')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All')
  const [messageInput, setMessageInput] = useState('')
  const [crew, setCrew] = useState<StoredCrewMember[]>([])
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [editingMember, setEditingMember] = useState<StoredCrewMember | null>(null)
  const [viewingProfile, setViewingProfile] = useState<StoredCrewMember | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const { currentUserEmail } = useAppStore()

  useEffect(() => {
    // Initialize crew system and load crew members
    initializeCrew()
    setCrew(getAllCrew())
  }, [])

  const isAdmin = isUserAdmin(currentUserEmail)
  const currentUserMember = crew.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())

  const filtered = crew
    .filter(m => isAdmin ? true : m.email.toLowerCase() === currentUserEmail.toLowerCase())
    .filter(m => roleMatch(m, roleFilter))
    .filter(m => search ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) : true)

  function startConversation(member: StoredCrewMember) {
    const threadId = getThreadId(currentUserMember?.id ?? 'user', member.id)
    setActiveThreadId(threadId)
  }

  function sendMessage() {
    if (!messageInput.trim() || !activeThreadId || !currentUserMember) return
    const msg: Message = {
      id: `msg-${Date.now()}`,
      threadId: activeThreadId,
      senderId: currentUserMember.id,
      senderName: `${currentUserMember.firstName} ${currentUserMember.lastName}`,
      body: messageInput.trim(),
      timestamp: Date.now(),
      read: true,
    }
    saveThreadMessage(activeThreadId, msg)
    setMessageInput('')
    setRefresh(prev => prev + 1)
  }

  const currentThreadMsgs = activeThreadId ? getThreadMessages(activeThreadId) : []
  const otherUserId = activeThreadId?.split('-').find(id => id !== currentUserMember?.id) ?? ''
  const otherUser = crew.find(m => m.id === otherUserId)

  // Get all unique conversations
  const conversations = new Map<string, { member: StoredCrewMember; lastMessage?: Message }>()
  const allMessages = localStorage.getItem(CREW_MESSAGES_KEY)
  if (allMessages) {
    try {
      const messagesByThread = JSON.parse(allMessages)
      Object.entries(messagesByThread).forEach(([threadId, messages]: [string, any]) => {
        const ids = threadId.split('-')
        const otherUserId = ids.find(id => id !== currentUserMember?.id)
        if (otherUserId) {
          const member = crew.find(m => m.id === otherUserId)
          if (member) {
            const lastMsg = messages[messages.length - 1]
            conversations.set(threadId, { member, lastMessage: lastMsg })
          }
        }
      })
    } catch (err) {
      console.error('[Messages] Failed to parse messages:', err)
    }
  }

  return (
    <AppLayout>
      <div className="pt-14">
        {activeThreadId ? (
          /* Message thread view */
          <div className="flex flex-col h-[calc(100vh-5rem)] -mx-4">
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 pb-4 border-b border-slate-200 shrink-0">
              <button onClick={() => setActiveThreadId(null)} className="text-brand-amber">
                <ChevronLeft size={22} />
              </button>
              <Avatar name={otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User'} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 font-semibold text-sm truncate">
                  {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User'}
                </p>
                <p className="text-slate-500 text-xs">{otherUser?.roleLabel ?? ''}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" key={`messages-${activeThreadId}-${refresh}`}>
              {currentThreadMsgs.map(msg => {
                const isMe = msg.senderId === currentUserMember?.id
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!isMe && <Avatar name={msg.senderName} size={28} />}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {!isMe && <p className="text-slate-500 text-[10px] px-1">{msg.senderName}</p>}
                      <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-brand-amber text-slate-900 rounded-br-md' : 'bg-bg-elevated text-slate-800 rounded-bl-md'}`}>
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
              <div className="flex gap-3 items-center">
                {isAdmin && (
                  <button
                    onClick={() => setShowAddCrew(true)}
                    className="bg-brand-amber hover:bg-amber-500 text-slate-900 rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} /> Add
                  </button>
                )}
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
                    className="w-full bg-bg-surface border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 text-sm placeholder:text-slate-600"
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
                    const sc = getOnlineStatus(member)
                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => isAdmin && setViewingProfile(member)}
                        className={`bg-bg-surface rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 group ${isAdmin ? 'cursor-pointer hover:border-brand-amber/50 transition-colors' : ''}`}
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
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              startConversation(member)
                            }}
                            className="p-1.5 rounded-lg bg-brand-amber/10 text-brand-amber hover:bg-brand-amber/20 transition-colors"
                            title="Message"
                          >
                            <MessageCircle size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setEditingMember(member)
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-all"
                              title="Edit crew member"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </>
            ) : (
              /* Messages tab */
              <div className="space-y-2">
                {conversations.size === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No conversations yet. Click the message button on a crew member to start a conversation.</p>
                ) : (
                  Array.from(conversations.values()).map((conv, i) => (
                    <motion.button
                      key={conv.member.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => {
                        const threadId = getThreadId(currentUserMember?.id ?? 'user', conv.member.id)
                        setActiveThreadId(threadId)
                      }}
                      className="w-full text-left bg-bg-surface rounded-xl border border-slate-200 p-4 flex items-center gap-3 active:bg-bg-elevated transition-colors"
                    >
                      <Avatar name={`${conv.member.firstName} ${conv.member.lastName}`} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-800">
                          {conv.member.firstName} {conv.member.lastName}
                        </p>
                        <p className="text-slate-500 text-xs truncate mt-0.5">{conv.lastMessage?.body ?? 'No messages'}</p>
                      </div>
                      {conv.lastMessage && (
                        <div className="flex-col items-end gap-1.5 shrink-0 hidden sm:flex">
                          <p className="text-slate-600 text-[10px]">{formatDistanceToNow(conv.lastMessage.timestamp, { addSuffix: false })}</p>
                        </div>
                      )}
                    </motion.button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showAddCrew && (
          <AddCrewModal
            onClose={() => setShowAddCrew(false)}
            onCrewAdded={() => {
              setCrew(getAllCrew())
              setShowAddCrew(false)
            }}
          />
        )}
        {editingMember && (
          <EditCrewModal
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onUpdated={() => {
              setCrew(getAllCrew())
              setEditingMember(null)
            }}
          />
        )}
        {viewingProfile && (
          <EmployeeProfileSheet
            member={viewingProfile}
            onClose={() => setViewingProfile(null)}
            isAdmin={isAdmin}
            onUpdated={() => {
              setCrew(getAllCrew())
              // Find and update the viewing profile with new data
              const updated = getAllCrew().find(m => m.email === viewingProfile.email)
              if (updated) {
                setViewingProfile(updated)
              }
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
