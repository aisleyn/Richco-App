import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronLeft, Send, X, Users, Plus, Edit2, MessageCircle } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { formatDistanceToNow } from 'date-fns'
import { getAllCrew, isUserAdmin, initializeCrew } from '../services/crew'
import { AddCrewModal } from '../components/crew/AddCrewModal'
import { EditCrewModal } from '../components/crew/EditCrewModal'
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

const statusConfig: Record<string, { label: string; color: string; text: string }> = {
  online:    { label: 'Online',    color: 'bg-emerald-400', text: 'text-emerald-400' },
  onsite:    { label: 'On Site',   color: 'bg-emerald-400', text: 'text-emerald-400' },
  enroute:   { label: 'En Route',  color: 'bg-amber-400',   text: 'text-amber-400' },
  available: { label: 'Available', color: 'bg-green-400',    text: 'text-green-400' },
  off:       { label: 'Off Today', color: 'bg-slate-500',   text: 'text-slate-500' },
}

function getOnlineStatus(member: StoredCrewMember): { label: string; color: string; text: string } {
  if (member.clockedInAt) {
    return statusConfig.online
  }
  return statusConfig[member.status] || statusConfig.available
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
  const [messageInput, setMessageInput] = useState('')
  const [crew, setCrew] = useState<StoredCrewMember[]>([])
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [editingMember, setEditingMember] = useState<StoredCrewMember | null>(null)
  const [viewingProfile, setViewingProfile] = useState<StoredCrewMember | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const { currentUserEmail, setUnreadMessageCount } = useAppStore()

  // Calculate unread message count
  const calculateUnreadCount = () => {
    try {
      const stored = localStorage.getItem(CREW_MESSAGES_KEY)
      if (!stored) return 0
      const messages = JSON.parse(stored)
      let count = 0
      Object.values(messages).forEach((threadMessages: any) => {
        if (Array.isArray(threadMessages)) {
          count += threadMessages.filter((m: any) => !m.read && m.senderId !== currentUserMember?.id).length
        }
      })
      return count
    } catch {
      return 0
    }
  }

  // Mark messages as read when viewing a thread
  const markThreadAsRead = (threadId: string) => {
    try {
      const stored = localStorage.getItem(CREW_MESSAGES_KEY)
      if (!stored) return
      const messages = JSON.parse(stored)
      if (messages[threadId]) {
        messages[threadId] = messages[threadId].map((m: any) => ({
          ...m,
          read: m.senderId !== currentUserMember?.id ? true : m.read
        }))
        localStorage.setItem(CREW_MESSAGES_KEY, JSON.stringify(messages))
        setUnreadMessageCount(calculateUnreadCount())
      }
    } catch (err) {
      console.error('[Messages] Failed to mark thread as read:', err)
    }
  }

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Initialize crew system and load crew members
    const loadCrew = async () => {
      initializeCrew()
      const members = await getAllCrew()
      setCrew(members)
      const admin = await isUserAdmin(currentUserEmail)
      setIsAdmin(admin)
      setUnreadMessageCount(calculateUnreadCount())
    }
    loadCrew()
  }, [setUnreadMessageCount, currentUserEmail])
  const currentUserMember = crew.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())
  const canViewTimesheets = isAdmin || currentUserMember?.role === 'leadership'

  const filtered = crew
    .filter(m => search ? `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) : true)

  function startConversation(member: StoredCrewMember) {
    const currentId = String(currentUserMember?.id ?? 'user')
    const memberId = String(member.id)
    const threadId = getThreadId(currentId, memberId)
    setActiveThreadId(threadId)
  }

  function sendMessage() {
    if (!messageInput.trim() || !activeThreadId || !currentUserMember) return
    const msg: Message = {
      id: `msg-${Date.now()}`,
      threadId: activeThreadId,
      senderId: String(currentUserMember.id),
      senderName: `${currentUserMember.firstName} ${currentUserMember.lastName}`,
      body: messageInput.trim(),
      timestamp: Date.now(),
      read: true,
    }
    saveThreadMessage(activeThreadId, msg)
    setMessageInput('')
    setRefresh(prev => prev + 1)
    // Update unread count after sending
    setUnreadMessageCount(calculateUnreadCount())
  }

  // Mark thread messages as read when viewing
  useEffect(() => {
    if (activeThreadId) {
      markThreadAsRead(activeThreadId)
    }
  }, [activeThreadId])

  const currentThreadMsgs = activeThreadId ? getThreadMessages(activeThreadId) : []
  const currentUserIdStr = String(currentUserMember?.id ?? 'user')
  const otherUserId = activeThreadId?.split('-').find(id => id !== currentUserIdStr) ?? ''
  const otherUser = crew.find(m => String(m.id) === otherUserId)

  // Get all unique conversations
  const conversations = new Map<string, { member: StoredCrewMember; lastMessage?: Message }>()
  const allMessages = localStorage.getItem(CREW_MESSAGES_KEY)
  if (allMessages) {
    try {
      const messagesByThread = JSON.parse(allMessages)
      Object.entries(messagesByThread).forEach(([threadId, messages]: [string, any]) => {
        const ids = threadId.split('-')
        const currentIdStr = String(currentUserMember?.id ?? 'user')
        const otherUserId = ids.find(id => id !== currentIdStr)
        if (otherUserId) {
          const member = crew.find(m => String(m.id) === otherUserId)
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
            <div className="flex items-center gap-3 px-4 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <button onClick={() => setActiveThreadId(null)} className="text-green-600">
                <ChevronLeft size={22} />
              </button>
              <Avatar name={otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User'} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 dark:text-slate-100 font-semibold text-sm truncate">
                  {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User'}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{otherUser?.roleLabel ?? ''}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" key={`messages-${activeThreadId}-${refresh}`}>
              {currentThreadMsgs.map(msg => {
                const isMe = msg.senderId === String(currentUserMember?.id)
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!isMe && <Avatar name={msg.senderName} size={28} />}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {!isMe && <p className="text-slate-500 dark:text-slate-400 text-[10px] px-1">{msg.senderName}</p>}
                      <div className={`px-4 py-2.5 rounded-2xl shadow-md ${isMe ? 'bg-green-600 text-slate-900 rounded-br-md' : 'bg-bg-elevated dark:bg-bg-elevated-dark text-slate-800 dark:text-slate-100 rounded-bl-md'}`}>
                        <p className="text-sm">{msg.body}</p>
                      </div>
                      <p className="text-slate-600 dark:text-slate-500 text-[10px] px-1">{formatDistanceToNow(msg.timestamp, { addSuffix: true })}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2 bg-bg-surface dark:bg-bg-surface-dark rounded-2xl border border-white/10 dark:border-white/5 px-4 py-2.5">
                <input
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-600 dark:placeholder:text-slate-500 outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="w-8 h-8 rounded-full bg-green-600 disabled:opacity-30 flex items-center justify-center shrink-0 transition-opacity"
                >
                  <Send size={14} className="text-slate-900" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold">Employee Hub</h1>
              <div className="flex gap-3 items-center">
                {isAdmin && (
                  <button
                    onClick={() => setShowAddCrew(true)}
                    className="bg-green-600 hover:bg-green-700 text-slate-900 rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} /> Add
                  </button>
                )}
                <div className="flex bg-bg-surface dark:bg-bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
                  {(['directory', 'messages'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-green-600 text-slate-900' : 'text-slate-400 dark:text-slate-500'}`}
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
                <div className="relative mb-6">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search employees..."
                    className="w-full bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-600 dark:placeholder:text-slate-500"
                  />
                  {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-slate-500 dark:text-slate-500" /></button>}
                </div>

                {/* Horizontal employee selection bar */}
                <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                  {filtered.map((member, i) => {
                    const sc = getOnlineStatus(member)
                    const isSelected = viewingProfile?.id === member.id
                    return (
                      <motion.button
                        key={member.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setViewingProfile(member)}
                        className={`flex-col items-center gap-2 shrink-0 p-3 rounded-2xl transition-all ${
                          isSelected
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : 'bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 hover:border-green-600/50 text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <div className="relative">
                          <Avatar name={`${member.firstName} ${member.lastName}`} size={48} />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${sc.color} border-2 ${isSelected ? 'border-green-600' : 'border-bg-surface dark:border-bg-surface-dark'}`} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold truncate max-w-[80px]">{member.firstName.split(' ')[0]}</p>
                          <p className={`text-[10px] ${isSelected ? 'text-green-50' : 'text-slate-500 dark:text-slate-400'}`}>{sc.label}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Profile display on main page */}
                {viewingProfile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold">{viewingProfile.firstName} {viewingProfile.lastName}</h2>
                        <p className="text-slate-500 text-sm">{viewingProfile.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startConversation(viewingProfile)}
                          className="p-2.5 rounded-lg bg-green-600 text-slate-900 hover:bg-green-700 transition-colors"
                          title="Message"
                        >
                          <MessageCircle size={18} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setEditingMember(viewingProfile)}
                            className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Edit employee"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Profile details */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-blue-600/10 to-amber-500/5 rounded-2xl border border-blue-600/20 p-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Role</p>
                          <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">{viewingProfile.roleLabel}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pay Type</p>
                          <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1 capitalize">
                            {viewingProfile.paymentType === 'hourly' ? 'Hourly' : 'Salary'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                            {viewingProfile.paymentType === 'hourly' ? 'Rate' : 'Salary'}
                          </p>
                          <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">
                            ${viewingProfile.hourlyRate || viewingProfile.salary || 'N/A'}
                            {viewingProfile.paymentType === 'hourly' && '/hr'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Hire Date</p>
                          <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">
                            {viewingProfile.hireDate ? new Date(viewingProfile.hireDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Select an employee to view details</p>
                  </div>
                )}
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
                        const threadId = getThreadId(String(currentUserMember?.id ?? 'user'), String(conv.member.id))
                        setActiveThreadId(threadId)
                      }}
                      className="w-full text-left bg-bg-surface rounded-xl border border-slate-200 p-4 flex items-center gap-3 active:bg-bg-elevated transition-colors shadow-md"
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
            onCrewAdded={async () => {
              const members = await getAllCrew()
              setCrew(members)
              setShowAddCrew(false)
            }}
          />
        )}
        {editingMember && (
          <EditCrewModal
            member={editingMember}
            onClose={() => setEditingMember(null)}
            onUpdated={async () => {
              const members = await getAllCrew()
              setCrew(members)
              setEditingMember(null)
              // Update the viewing profile if it was edited
              const updated = members.find(m => m.email === editingMember.email)
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
