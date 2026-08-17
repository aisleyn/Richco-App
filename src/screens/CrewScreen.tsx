import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronLeft, Send, X, Users, Plus, Edit2, MessageCircle, Download, Trash2, Calendar, Upload, FileUp } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { formatDistanceToNow } from 'date-fns'
import { getAllCrew, isUserAdmin, initializeCrew } from '../services/crew'
import { uploadCrewFile, updateCrewMemberFiles } from '../services/supabase'
import { supabase } from '../services/supabaseAuth'
import { AddCrewModal } from '../components/crew/AddCrewModal'
import { EditCrewModal } from '../components/crew/EditCrewModal'
import { DocumentUploadPreview } from '../components/crew/DocumentUploadPreview'
import type { Message } from '../types'
import type { StoredCrewMember } from '../services/crew'

const CREW_MESSAGES_KEY = 'richco-crew-messages'
const EMPLOYEE_COMMUNICATIONS_KEY = 'richco-employee-communications'

interface EmployeeCommunication {
  id: string
  employeeId: number
  message: string
  author: string
  timestamp: number
  attachmentUrl?: string
  attachmentName?: string
}

interface PPEItem {
  id: string
  employeeId: number
  equipmentName: string
  status: 'pending' | 'checked_out'
  issueDate: string
  expectedReturnDate?: string
  quantity: number
  checkedOutBy?: string
  checkedOutDate?: number
  returnedDate?: number
}

const PPE_ITEMS_KEY = 'richco-ppe-items'

function getThreadId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-')
}

function getEmployeeCommunications(employeeId: number): EmployeeCommunication[] {
  try {
    const stored = localStorage.getItem(EMPLOYEE_COMMUNICATIONS_KEY)
    const allComms = stored ? JSON.parse(stored) : {}
    return (allComms[employeeId] ?? []).sort((a: EmployeeCommunication, b: EmployeeCommunication) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

function saveEmployeeCommunication(employeeId: number, communication: EmployeeCommunication) {
  try {
    const stored = localStorage.getItem(EMPLOYEE_COMMUNICATIONS_KEY)
    const allComms = stored ? JSON.parse(stored) : {}
    if (!allComms[employeeId]) {
      allComms[employeeId] = []
    }
    allComms[employeeId].push(communication)
    localStorage.setItem(EMPLOYEE_COMMUNICATIONS_KEY, JSON.stringify(allComms))
  } catch (err) {
    console.error('[Employee Communications] Failed to save:', err)
  }
}

function getPPEItems(employeeId: number): PPEItem[] {
  try {
    const stored = localStorage.getItem(PPE_ITEMS_KEY)
    const allItems = stored ? JSON.parse(stored) : {}
    return (allItems[employeeId] ?? []).sort((a: PPEItem, b: PPEItem) => {
      const aDate = a.checkedOutDate || a.issueDate
      const bDate = b.checkedOutDate || b.issueDate
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })
  } catch {
    return []
  }
}

function savePPEItem(employeeId: number, item: PPEItem) {
  try {
    const stored = localStorage.getItem(PPE_ITEMS_KEY)
    const allItems = stored ? JSON.parse(stored) : {}
    if (!allItems[employeeId]) {
      allItems[employeeId] = []
    }
    const index = allItems[employeeId].findIndex((i: PPEItem) => i.id === item.id)
    if (index >= 0) {
      allItems[employeeId][index] = item
    } else {
      allItems[employeeId].push(item)
    }
    localStorage.setItem(PPE_ITEMS_KEY, JSON.stringify(allItems))
  } catch (err) {
    console.error('[PPE Items] Failed to save:', err)
  }
}

function deletePPEItem(employeeId: number, itemId: string) {
  try {
    const stored = localStorage.getItem(PPE_ITEMS_KEY)
    const allItems = stored ? JSON.parse(stored) : {}
    if (allItems[employeeId]) {
      allItems[employeeId] = allItems[employeeId].filter((i: PPEItem) => i.id !== itemId)
      localStorage.setItem(PPE_ITEMS_KEY, JSON.stringify(allItems))
    }
  } catch (err) {
    console.error('[PPE Items] Failed to delete:', err)
  }
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

export function CrewScreen({ onNavigate }: { onNavigate?: (s: string) => void }) {
  const [tab, setTab] = useState<'directory' | 'messages'>('directory')
  const [search, setSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [employeeCommunicationInput, setEmployeeCommunicationInput] = useState('')
  const [crew, setCrew] = useState<StoredCrewMember[]>([])
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [editingMember, setEditingMember] = useState<StoredCrewMember | null>(null)
  const [viewingProfile, setViewingProfile] = useState<StoredCrewMember | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [commRefresh, setCommRefresh] = useState(0)
  const [ppeRefresh, setPpeRefresh] = useState(0)
  const [crewRefresh, setCrewRefresh] = useState(0)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [showAddPPE, setShowAddPPE] = useState(false)
  const [ppeFormData, setPpeFormData] = useState<{ name: string; status: 'pending' | 'checked_out'; issueDate: string; quantity: number }>({
    name: '',
    status: 'pending',
    issueDate: '',
    quantity: 1
  })
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; type: string } | null>(null)
  const [messageAttachedFile, setMessageAttachedFile] = useState<{ name: string; url: string; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageFileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const identificationInputRef = useRef<HTMLInputElement>(null)
  const qualificationsInputRef = useRef<HTMLInputElement>(null)
  const employmentFilesInputRef = useRef<HTMLInputElement>(null)
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

  // Auto-refresh crew members and messages
  useEffect(() => {
    const loadCrew = async () => {
      initializeCrew()
      const members = await getAllCrew()
      setCrew(members)
      const admin = await isUserAdmin(currentUserEmail)
      setIsAdmin(admin)
      setUnreadMessageCount(calculateUnreadCount())
    }

    loadCrew()

    // Auto-refresh crew list every 3 seconds to catch new registrations
    const crewInterval = setInterval(loadCrew, 3000)

    // Subscribe to real-time crew_members table changes (deletions, additions)
    const subscription = supabase
      .channel('crew_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members' },
        (payload) => {
          console.log('[Crew] Real-time update received:', payload.eventType)
          // Reload crew list on any change (insert, update, delete)
          loadCrew()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Crew] Real-time subscribed to crew_members changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Crew] Real-time subscription error')
        }
      })

    return () => {
      clearInterval(crewInterval)
      supabase.removeChannel(subscription)
    }
  }, [setUnreadMessageCount, currentUserEmail])

  // Auto-refresh messages every 2 seconds when in a thread
  useEffect(() => {
    if (!activeThreadId) return

    const messageRefreshInterval = setInterval(() => {
      setRefresh(prev => prev + 1)
      setUnreadMessageCount(calculateUnreadCount())
    }, 2000)

    return () => clearInterval(messageRefreshInterval)
  }, [activeThreadId, setUnreadMessageCount])
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
    if ((!messageInput.trim() && !messageAttachedFile) || !activeThreadId || !currentUserMember) return
    const msg: Message = {
      id: `msg-${Date.now()}`,
      threadId: activeThreadId,
      senderId: String(currentUserMember.id),
      senderName: `${currentUserMember.firstName} ${currentUserMember.lastName}`,
      body: messageInput.trim(),
      timestamp: Date.now(),
      read: true,
      attachmentUrl: messageAttachedFile?.url,
      attachmentName: messageAttachedFile?.name,
    }
    saveThreadMessage(activeThreadId, msg)
    setMessageInput('')
    setMessageAttachedFile(null)
    setRefresh(prev => prev + 1)
    // Update unread count after sending
    setUnreadMessageCount(calculateUnreadCount())
    // Refocus input on mobile for quick follow-up messages
    messageInputRef.current?.focus()
  }

  async function handleFileUpload(file: File, fileType: 'identification' | 'qualification' | 'employment_file') {
    if (!viewingProfile) return

    setFileError(null)
    setUploadingFile(fileType)

    try {
      const result = await uploadCrewFile(viewingProfile.email, fileType, file)
      if (!result) {
        setFileError('Failed to upload file. Please try again.')
        return
      }

      // Update crew member with the new file
      if (fileType === 'identification') {
        const identificationType = file.name.toLowerCase().includes('passport') ? 'passport' : 'drivers_license'
        await updateCrewMemberFiles(viewingProfile.email, {
          identification: {
            type: identificationType,
            url: result.url,
            uploadedDate: Date.now(),
          },
        })
        // Update local state
        viewingProfile.identification = {
          type: identificationType,
          url: result.url,
          uploadedDate: Date.now(),
        }
      } else if (fileType === 'qualification') {
        const qualifications = viewingProfile.qualifications || []
        qualifications.push({
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: result.url,
          uploadedDate: Date.now(),
        })
        await updateCrewMemberFiles(viewingProfile.email, { qualifications })
        viewingProfile.qualifications = qualifications
      } else if (fileType === 'employment_file') {
        const employmentFiles = viewingProfile.employmentFiles || []
        employmentFiles.push({
          id: `file-${Date.now()}`,
          name: file.name,
          type: 'contract',
          uploadedDate: Date.now(),
          url: result.url,
        })
        await updateCrewMemberFiles(viewingProfile.email, { employmentFiles })
        viewingProfile.employmentFiles = employmentFiles
      }

      // Refresh crew list to get updated data
      setCrewRefresh(prev => prev + 1)
    } catch (err) {
      console.error('File upload error:', err)
      setFileError('An error occurred during upload')
    } finally {
      setUploadingFile(null)
    }
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
    <AppLayout onNavigate={onNavigate}>
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
                const isImage = msg.attachmentName && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentName)
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!isMe && <Avatar name={msg.senderName} size={28} />}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {!isMe && <p className="text-slate-500 dark:text-slate-400 text-[10px] px-1">{msg.senderName}</p>}
                      <div className={`px-4 py-2.5 rounded-2xl shadow-md ${isMe ? 'bg-green-600 text-slate-900 rounded-br-md' : 'bg-bg-elevated dark:bg-bg-elevated-dark text-slate-800 dark:text-slate-100 rounded-bl-md'}`}>
                        {msg.body && <p className="text-sm">{msg.body}</p>}
                        {msg.attachmentUrl && isImage && (
                          <img
                            src={msg.attachmentUrl}
                            alt={msg.attachmentName}
                            className="max-w-[200px] rounded-lg mt-2"
                          />
                        )}
                        {msg.attachmentUrl && !isImage && (
                          <a
                            href={msg.attachmentUrl}
                            download={msg.attachmentName}
                            className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 text-xs bg-white/20 hover:bg-white/30 rounded transition-colors"
                          >
                            <Download size={12} /> {msg.attachmentName}
                          </a>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-500 text-[10px] px-1">{formatDistanceToNow(msg.timestamp, { addSuffix: true })}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700 shrink-0 space-y-2">
              {messageAttachedFile && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 border border-blue-200 dark:border-blue-800">
                  <span className="text-xs text-slate-600 dark:text-slate-400">📎 {messageAttachedFile.name}</span>
                  <button
                    onClick={() => setMessageAttachedFile(null)}
                    className="ml-auto p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                  >
                    <X size={14} className="text-blue-600" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 bg-bg-surface dark:bg-bg-surface-dark rounded-2xl border border-white/10 dark:border-white/5 px-4 py-2.5">
                <input
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-600 dark:placeholder:text-slate-500 outline-none"
                />
                <button
                  onClick={() => messageFileInputRef.current?.click()}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                  title="Attach file"
                >
                  📎
                </button>
                <input
                  ref={messageFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        setMessageAttachedFile({
                          name: file.name,
                          url: event.target?.result as string,
                          type: file.type,
                        })
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() && !messageAttachedFile}
                  className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-green-600 disabled:opacity-30 flex items-center justify-center shrink-0 transition-opacity hover:bg-green-700 active:scale-95"
                  title="Send message (Enter key or tap)"
                >
                  <Send size={16} className="text-white md:text-slate-900" />
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
                  <div className="space-y-6">
                    {/* Header with name and actions */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-slate-900 dark:text-slate-100 text-2xl font-bold">{viewingProfile.firstName} {viewingProfile.lastName}</h2>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{viewingProfile.roleLabel}</span>
                          {viewingProfile.paymentType && (
                            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">{viewingProfile.paymentType === 'hourly' ? 'Hourly' : 'Salary'}</span>
                          )}
                        </div>
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

                    {/* Two column layout: Info on left, Communication on right */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left column: Basic info */}
                      <div className="lg:col-span-1 space-y-4">
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-br from-blue-600/10 to-amber-500/5 rounded-2xl border border-blue-600/20 p-5"
                        >
                          <div className="space-y-4">
                            <div>
                              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Position</p>
                              <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">{viewingProfile.roleLabel}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Hire Date</p>
                              <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">
                                {viewingProfile.hireDate ? new Date(viewingProfile.hireDate).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pay Type</p>
                              <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1 capitalize">
                                {viewingProfile.paymentType === 'hourly' ? 'Hourly' : 'Salary'}
                              </p>
                            </div>
                            {viewingProfile.hourlyRate && (
                              <div>
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Rate</p>
                                <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">${viewingProfile.hourlyRate}/hr</p>
                              </div>
                            )}
                            {viewingProfile.salary && (
                              <div>
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Salary</p>
                                <p className="text-slate-900 dark:text-slate-100 font-semibold mt-1">${viewingProfile.salary}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>

                        {/* Emergency Contact */}
                        {viewingProfile.emergencyContact && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800 p-5"
                          >
                            <h3 className="text-red-700 dark:text-red-400 font-bold text-sm mb-3">Emergency Contact</h3>
                            <div className="space-y-2">
                              <p className="text-slate-900 dark:text-slate-100 font-medium">{viewingProfile.emergencyContact.name}</p>
                              <p className="text-slate-600 dark:text-slate-400 text-sm">{viewingProfile.emergencyContact.relationship}</p>
                              <a href={`tel:${viewingProfile.emergencyContact.phone}`} className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                                {viewingProfile.emergencyContact.phone}
                              </a>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Right column: Communication History */}
                      <div className="lg:col-span-2">
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col h-full"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg flex items-center gap-2">
                              <MessageCircle size={20} className="text-blue-600" />
                              Communication History
                            </h3>
                            <button className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                              <X size={18} />
                            </button>
                          </div>

                          {/* Communication input */}
                          <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                            <textarea
                              value={employeeCommunicationInput}
                              onChange={e => setEmployeeCommunicationInput(e.target.value)}
                              placeholder="Share a detailed update..."
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />

                            {/* Attached file preview */}
                            {attachedFile && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 border border-blue-200 dark:border-blue-800">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Attached: {attachedFile.name}</p>
                                </div>
                                <button
                                  onClick={() => setAttachedFile(null)}
                                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                                >
                                  <X size={16} className="text-blue-600" />
                                </button>
                              </div>
                            )}

                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                📎 Attach File
                              </button>
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    const reader = new FileReader()
                                    reader.onload = (event) => {
                                      setAttachedFile({
                                        name: file.name,
                                        url: event.target?.result as string,
                                        type: file.type,
                                      })
                                    }
                                    reader.readAsDataURL(file)
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if ((employeeCommunicationInput.trim() || attachedFile) && viewingProfile.id) {
                                    const comm: EmployeeCommunication = {
                                      id: `comm-${Date.now()}`,
                                      employeeId: viewingProfile.id,
                                      message: employeeCommunicationInput.trim(),
                                      author: currentUserEmail.split('@')[0],
                                      timestamp: Date.now(),
                                      attachmentUrl: attachedFile?.url,
                                      attachmentName: attachedFile?.name,
                                    }
                                    saveEmployeeCommunication(viewingProfile.id, comm)
                                    setEmployeeCommunicationInput('')
                                    setAttachedFile(null)
                                    setCommRefresh(prev => prev + 1)
                                  }
                                }}
                                disabled={!employeeCommunicationInput.trim() && !attachedFile}
                                className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Send size={16} /> Post to Timeline
                              </button>
                            </div>
                          </div>

                          {/* Communication history */}
                          <div className="flex-1 overflow-y-auto space-y-4" key={`comms-${viewingProfile.id}-${commRefresh}`}>
                            {getEmployeeCommunications(viewingProfile.id).length > 0 ? (
                              getEmployeeCommunications(viewingProfile.id).map(comm => {
                                const isImage = comm.attachmentName && /\.(jpg|jpeg|png|gif|webp)$/i.test(comm.attachmentName)
                                const isPDF = comm.attachmentName && /\.pdf$/i.test(comm.attachmentName)
                                return (
                                  <motion.div
                                    key={comm.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 pb-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                      {comm.author.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{comm.author}</p>
                                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{formatDistanceToNow(comm.timestamp, { addSuffix: true })}</p>
                                      {comm.message && <p className="text-slate-700 dark:text-slate-300 text-sm mt-2">{comm.message}</p>}

                                      {/* Attachment display */}
                                      {comm.attachmentUrl && (
                                        <div className="mt-3">
                                          {isImage ? (
                                            <div className="space-y-2">
                                              <img
                                                src={comm.attachmentUrl}
                                                alt={comm.attachmentName}
                                                className="max-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700"
                                              />
                                              <a
                                                href={comm.attachmentUrl}
                                                download={comm.attachmentName}
                                                className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                              >
                                                <Download size={14} /> Download
                                              </a>
                                            </div>
                                          ) : (
                                            <a
                                              href={comm.attachmentUrl}
                                              download={comm.attachmentName}
                                              className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                            >
                                              <Download size={14} /> {comm.attachmentName}
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )
                              })
                            ) : (
                              <p className="text-slate-500 dark:text-slate-400 text-center py-8 text-sm">No communication history yet.</p>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Document cards at bottom */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Identification */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6"
                      >
                        <div className="text-3xl mb-3 text-center">🪪</div>
                        <h4 className="text-slate-900 dark:text-slate-100 font-semibold mb-4 text-center">Identification</h4>

                        {isAdmin ? (
                          <DocumentUploadPreview
                            email={viewingProfile.email}
                            fileType="identification"
                            initialDocument={viewingProfile.identification ? {
                              name: `${viewingProfile.identification.type} Document`,
                              url: viewingProfile.identification.url,
                              path: '',
                              uploadedDate: 0
                            } : null}
                            onDocumentAdded={(doc) => {
                              const idType = viewingProfile.identification?.type || 'passport'
                              viewingProfile.identification = {
                                type: idType,
                                url: doc.url,
                                uploadedDate: doc.uploadedDate,
                              }
                              updateCrewMemberFiles(viewingProfile.email, { identification: viewingProfile.identification })
                            }}
                            onDocumentRemoved={() => {
                              viewingProfile.identification = undefined
                              updateCrewMemberFiles(viewingProfile.email, { identification: undefined })
                            }}
                          />
                        ) : viewingProfile.identification?.url ? (
                          <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-center">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              {viewingProfile.identification.type.replace('_', ' ')}
                            </p>
                            <a
                              href={viewingProfile.identification.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              View Document
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                            No identification document uploaded
                          </p>
                        )}
                      </motion.div>

                      {/* Qualifications */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6"
                      >
                        <div className="text-3xl mb-3 text-center">📜</div>
                        <h4 className="text-slate-900 dark:text-slate-100 font-semibold mb-1 text-center">Qualifications</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 text-center">Certificates and Degrees</p>

                        {viewingProfile.qualifications && viewingProfile.qualifications.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {viewingProfile.qualifications.map((q, i) => (
                              <div key={i}>
                                {q.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(q.url) && (
                                  <img
                                    src={q.url}
                                    alt={q.name}
                                    className="w-full h-32 object-cover rounded-lg mb-2 border border-slate-300 dark:border-slate-600"
                                  />
                                )}
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs text-slate-700 dark:text-slate-300 flex-1">{q.name}</p>
                                  {q.url && (
                                    <a
                                      href={q.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm font-medium text-center mb-3">No qualifications</p>
                        )}

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => qualificationsInputRef.current?.click()}
                              disabled={uploadingFile === 'qualification'}
                              className="w-full px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              <FileUp size={12} /> Add Qualification
                            </button>
                            <input
                              ref={qualificationsInputRef}
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'qualification')}
                              className="hidden"
                            />
                          </>
                        )}
                      </motion.div>

                      {/* Employment Files */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6"
                      >
                        <div className="text-3xl mb-3 text-center">📄</div>
                        <h4 className="text-slate-900 dark:text-slate-100 font-semibold mb-1 text-center">Employment Files</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 text-center">Contracts and Official Letters</p>

                        {viewingProfile.employmentFiles && viewingProfile.employmentFiles.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {viewingProfile.employmentFiles.map((f, i) => (
                              <div key={i}>
                                {f.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.url) && (
                                  <img
                                    src={f.url}
                                    alt={f.name}
                                    className="w-full h-32 object-cover rounded-lg mb-2 border border-slate-300 dark:border-slate-600"
                                  />
                                )}
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
                                >
                                  {f.name}
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm font-medium text-center mb-3">No files</p>
                        )}

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => employmentFilesInputRef.current?.click()}
                              disabled={uploadingFile === 'employment_file'}
                              className="w-full px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              <FileUp size={12} /> Add Employment File
                            </button>
                            <input
                              ref={employmentFilesInputRef}
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'employment_file')}
                              className="hidden"
                            />
                          </>
                        )}
                      </motion.div>
                    </div>

                    {/* Leave Balance Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-emerald-600/10 to-emerald-500/5 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6"
                    >
                      <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg mb-4">Leave Balance & Timeline</h3>
                      {viewingProfile.leaveData ? (
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Annual Allowance</p>
                              <p className="text-slate-900 dark:text-slate-100 font-bold">{viewingProfile.leaveData.annualAllowance} days</p>
                            </div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full w-full" />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-slate-500 text-xs font-semibold uppercase">Used</p>
                              <p className="text-slate-900 dark:text-slate-100 font-bold text-lg mt-1">{viewingProfile.leaveData.used}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs font-semibold uppercase">Approved</p>
                              <p className="text-slate-900 dark:text-slate-100 font-bold text-lg mt-1">{viewingProfile.leaveData.approved}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-xs font-semibold uppercase">Pending</p>
                              <p className="text-slate-900 dark:text-slate-100 font-bold text-lg mt-1">{viewingProfile.leaveData.pending}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center justify-between">
                              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Remaining</p>
                              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                {viewingProfile.leaveData.annualAllowance - viewingProfile.leaveData.used} days
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No leave data available</p>
                      )}
                    </motion.div>

                    {/* PPE & Safety Equipment Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-900 dark:text-slate-100 font-bold text-lg">PPE & Safety Equipment</h3>
                        {isAdmin && (
                          <button
                            onClick={() => setShowAddPPE(!showAddPPE)}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                          >
                            <Plus size={14} /> Add Item
                          </button>
                        )}
                      </div>

                      {/* Add PPE Form */}
                      {showAddPPE && isAdmin && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-4 space-y-3 border border-slate-200 dark:border-slate-700"
                        >
                          <input
                            type="text"
                            placeholder="Equipment name"
                            value={ppeFormData.name}
                            onChange={e => setPpeFormData({ ...ppeFormData, name: e.target.value })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                          />
                          <select
                            value={ppeFormData.status}
                            onChange={e => setPpeFormData({ ...ppeFormData, status: e.target.value as 'pending' | 'checked_out' })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                          >
                            <option value="pending">Pending</option>
                            <option value="checked_out">Checked Out</option>
                          </select>
                          <input
                            type="date"
                            value={ppeFormData.issueDate}
                            onChange={e => setPpeFormData({ ...ppeFormData, issueDate: e.target.value })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                          />
                          <input
                            type="number"
                            placeholder="Quantity"
                            min="1"
                            value={ppeFormData.quantity}
                            onChange={e => setPpeFormData({ ...ppeFormData, quantity: parseInt(e.target.value) || 1 })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (ppeFormData.name && ppeFormData.issueDate && viewingProfile.id) {
                                  const item: PPEItem = {
                                    id: `ppe-${Date.now()}`,
                                    employeeId: viewingProfile.id,
                                    equipmentName: ppeFormData.name,
                                    status: ppeFormData.status,
                                    issueDate: ppeFormData.issueDate,
                                    quantity: ppeFormData.quantity,
                                    checkedOutBy: currentUserEmail.split('@')[0],
                                    checkedOutDate: ppeFormData.status === 'checked_out' ? Date.now() : undefined,
                                  }
                                  savePPEItem(viewingProfile.id, item)
                                  setPpeFormData({ name: '', status: 'pending', issueDate: '', quantity: 1 })
                                  setShowAddPPE(false)
                                  setPpeRefresh(prev => prev + 1)
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                            >
                              Add Item
                            </button>
                            <button
                              onClick={() => setShowAddPPE(false)}
                              className="flex-1 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* PPE Items List */}
                      <div className="space-y-2" key={`ppe-${viewingProfile.id}-${ppeRefresh}`}>
                        {getPPEItems(viewingProfile.id).length > 0 ? (
                          getPPEItems(viewingProfile.id).map(item => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{item.equipmentName}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                  Qty: {item.quantity} • {item.issueDate}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  item.status === 'checked_out'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                }`}>
                                  {item.status === 'checked_out' ? 'Checked Out' : 'Pending'}
                                </span>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      deletePPEItem(viewingProfile.id, item.id)
                                      setPpeRefresh(prev => prev + 1)
                                    }}
                                    className="p-1.5 text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                                    title="Delete item"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">No PPE items recorded</p>
                        )}
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
              // Immediately remove the user from current crew state
              // This ensures UI updates even if API call is slow
              const filteredCrew = crew.filter(m => m.email !== editingMember.email)
              setCrew(filteredCrew)
              setViewingProfile(null)
              setEditingMember(null)
              setSearch('') // Clear search to show full list

              // Then do a full refresh to confirm with server
              try {
                const members = await getAllCrew()
                setCrew(members)
              } catch (err) {
                console.error('[Crew] Failed to refresh crew list:', err)
              }
            }}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
