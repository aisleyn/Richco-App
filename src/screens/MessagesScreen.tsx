import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Plus, X, Users, Search, AlertCircle, Paperclip, Download, Play, Loader, Image as ImageIcon } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import {
  getConversations,
  getThreadMessages,
  sendMessage,
  createDirectThread,
  createGroupThread,
  subscribeToThreadMessages,
  subscribeToConversations,
  markThreadAsRead,
  getCrewEmails,
  uploadMessageMedia,
  type MessageThread,
  type Message
} from '../services/messaging'
import { postNotification } from '../services/notificationService'
import { ImageViewerModal } from '../components/ImageViewerModal'

interface Props {
  onNavigate: (screen: string) => void
}

export function MessagesScreen({ onNavigate }: Props) {
  const { currentUserEmail, currentUserName } = useAppStore()
  const [conversations, setConversations] = useState<MessageThread[]>([])
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [crewList, setCrewList] = useState<Array<{ email: string; name: string }>>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [groupName, setGroupName] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Media upload state
  const [attachedMedia, setAttachedMedia] = useState<Array<{ file: File; preview: string; type: string }>>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null)
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null)

  // Load conversations on mount
  useEffect(() => {
    if (!currentUserEmail) return

    loadConversations()
    loadCrewList()

    // Subscribe to new threads
    const unsubscribe = subscribeToConversations(currentUserEmail, (thread) => {
      setConversations(prev => {
        const exists = prev.find(t => t.id === thread.id)
        return exists ? prev : [thread, ...prev]
      })
    })

    return unsubscribe
  }, [currentUserEmail])

  // Load messages when thread changes
  useEffect(() => {
    if (!selectedThread) return

    loadMessages(selectedThread.id)
    markThreadAsRead(selectedThread.id, currentUserEmail)

    // Subscribe to new messages
    const unsubscribe = subscribeToThreadMessages(selectedThread.id, (message) => {
      setMessages(prev => [...prev, message])
      markThreadAsRead(selectedThread.id, currentUserEmail)

      // Notify if message is from someone else
      if (message.sender_email !== currentUserEmail) {
        postNotification(
          message.sender_name || message.sender_email,
          message.content,
          message.sender_email,
          'update'
        )
      }
    })

    return unsubscribe
  }, [selectedThread, currentUserEmail])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    if (!currentUserEmail) return
    setLoading(true)
    const data = await getConversations(currentUserEmail)
    setConversations(data)
    setLoading(false)
  }

  async function loadMessages(threadId: string) {
    const data = await getThreadMessages(threadId)
    setMessages(data)
  }

  async function loadCrewList() {
    const crew = await getCrewEmails()
    setCrewList(crew.filter(c => c.email !== currentUserEmail))
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedThread || (!messageInput.trim() && attachedMedia.length === 0)) return

    setSending(true)
    setUploadingMedia(true)

    try {
      // Upload media files if any
      const mediaUrls: string[] = []
      const mediaTypes: string[] = []

      for (const media of attachedMedia) {
        const result = await uploadMessageMedia(media.file, selectedThread.id)
        if (result) {
          mediaUrls.push(result.url)
          mediaTypes.push(result.type)
        }
      }

      // Send message with media
      const result = await sendMessage(
        selectedThread.id,
        messageInput,
        currentUserEmail,
        currentUserName,
        mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaTypes.length > 0 ? mediaTypes : undefined
      )

      if (result) {
        setMessageInput('')
        setAttachedMedia([])
        // Reload conversations to update last_message_at
        await loadConversations()
      }
    } catch (err) {
      console.error('[MessagesScreen] Error sending message with media:', err)
    } finally {
      setSending(false)
      setUploadingMedia(false)
    }
  }

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(f => {
      // Validate file type (images and videos only)
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        alert('Only images and videos are supported')
        return
      }

      const preview = URL.createObjectURL(f)
      setAttachedMedia(prev => [...prev, { file: f, preview, type: f.type }])
    })
  }

  async function handleStartDirectMessage(email: string, name: string) {
    try {
      console.log('[MessagesScreen] Starting DM with:', email)
      const thread = await createDirectThread(email, name, currentUserEmail, currentUserName)
      if (thread) {
        console.log('[MessagesScreen] ✅ Thread created:', thread.id)
        setSelectedThread(thread)
        setShowNewChat(false)
        setSearchQuery('')
        await loadConversations()
      } else {
        console.error('[MessagesScreen] ❌ createDirectThread returned null')
        alert('Failed to create message thread. Please try again.')
      }
    } catch (err) {
      console.error('[MessagesScreen] ❌ Error starting DM:', err)
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function handleCreateGroupChat() {
    if (!groupName.trim() || selectedMembers.size === 0) {
      alert('Please enter a group name and select at least one member')
      return
    }

    const thread = await createGroupThread(
      groupName,
      Array.from(selectedMembers),
      currentUserEmail
    )

    if (thread) {
      setSelectedThread(thread)
      setShowGroupChat(false)
      setGroupName('')
      setSelectedMembers(new Set())
      await loadConversations()
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      conv.name?.toLowerCase().includes(searchLower) ||
      conv.participants?.some(p => p.email.toLowerCase().includes(searchLower))
    )
  })

  const filteredCrewList = crewList.filter(member => {
    const searchLower = searchQuery.toLowerCase()
    return (
      member.email.toLowerCase().includes(searchLower) ||
      member.name.toLowerCase().includes(searchLower)
    )
  })

  return (
    <AppLayout>
      <div className="pt-14 h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Start new chat"
            >
              <Plus size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations or people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
        </motion.div>

        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {/* Conversations List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <AlertCircle size={32} className="text-slate-400 mb-2" />
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedThread(conv)}
                    className={`w-full p-4 border-b border-slate-100 dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      selectedThread?.id === conv.id
                        ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                          {conv.is_group ? conv.name : conv.participants
                            ?.find(p => p.email !== currentUserEmail)?.email
                            ?.split('@')[0] || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1">
                          {conv.lastMessage?.content || 'No messages'}
                        </p>
                      </div>
                      {conv.unreadCount && conv.unreadCount > 0 && (
                        <span className="ml-2 px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Chat View */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
          >
            {selectedThread ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-700 dark:to-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedThread.is_group ? selectedThread.name : (
                          selectedThread.participants
                            ?.find(p => p.email !== currentUserEmail)?.email || 'Unknown'
                        )}
                      </h2>
                      {selectedThread.is_group && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {selectedThread.participants?.length || 0} members
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          msg.sender_email === currentUserEmail ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md rounded-lg ${
                            msg.sender_email === currentUserEmail
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                          }`}
                        >
                          {selectedThread.is_group && msg.sender_email !== currentUserEmail && (
                            <p className="text-xs font-semibold mb-1 opacity-75 px-4 pt-2">
                              {msg.sender_name || msg.sender_email.split('@')[0]}
                            </p>
                          )}

                          {/* Media attachments */}
                          {msg.media_urls && msg.media_urls.length > 0 && (
                            <div className="grid grid-cols-2 gap-1 p-2">
                              {msg.media_urls.map((url, idx) => {
                                const type = msg.media_types?.[idx] || ''
                                const isImage = type.startsWith('image/')
                                const isVideo = type.startsWith('video/')

                                return (
                                  <div
                                    key={idx}
                                    className="relative group cursor-pointer rounded-lg overflow-hidden bg-black/20"
                                  >
                                    {isImage ? (
                                      <>
                                        <img
                                          src={url}
                                          alt={`Media ${idx + 1}`}
                                          onClick={() => {
                                            setSelectedMediaUrl(url)
                                            setSelectedMediaType(type)
                                          }}
                                          className="w-full h-32 object-cover hover:opacity-75 transition-opacity"
                                        />
                                        <ImageIcon
                                          size={20}
                                          className="absolute top-1 right-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        />
                                      </>
                                    ) : isVideo ? (
                                      <>
                                        <video
                                          src={url}
                                          className="w-full h-32 object-cover hover:opacity-75 transition-opacity"
                                        />
                                        <Play
                                          size={20}
                                          className="absolute top-1 right-1 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white"
                                        />
                                      </>
                                    ) : null}

                                    {/* Download button */}
                                    <button
                                      onClick={() => {
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = `media-${Date.now()}`
                                        a.click()
                                      }}
                                      className="absolute bottom-1 left-1 p-1 bg-black/70 hover:bg-black/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Download"
                                    >
                                      <Download size={14} className="text-white" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Text content */}
                          {msg.content.trim() && (
                            <p className="text-sm break-words px-4 py-2">
                              {msg.content}
                            </p>
                          )}

                          <p className="text-xs opacity-70 px-4 pb-2">
                            {new Date(msg.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached media preview */}
                {attachedMedia.length > 0 && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Attached ({attachedMedia.length})
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {attachedMedia.map((media, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={media.preview}
                            alt={`Attached ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                          />
                          <button
                            onClick={() =>
                              setAttachedMedia(prev => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="flex gap-2">
                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaSelect}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      disabled={sending || uploadingMedia}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Attach image or video"
                    >
                      <Paperclip size={20} />
                    </button>

                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={sending || uploadingMedia}
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
                    />

                    <button
                      type="submit"
                      disabled={sending || uploadingMedia || (!messageInput.trim() && attachedMedia.length === 0)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      {uploadingMedia ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Media Viewer Modal */}
      {selectedMediaUrl && selectedMediaType?.startsWith('image/') && (
        <ImageViewerModal
          isOpen={selectedMediaUrl !== null}
          imageUrl={selectedMediaUrl}
          fileName={`message-media-${Date.now()}`}
          onClose={() => {
            setSelectedMediaUrl(null)
            setSelectedMediaType(null)
          }}
        />
      )}

      {/* Video Viewer Modal */}
      {selectedMediaUrl && selectedMediaType?.startsWith('video/') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedMediaUrl(null)
            setSelectedMediaType(null)
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setSelectedMediaUrl(null)
                setSelectedMediaType(null)
              }}
              className="absolute -top-10 right-0 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X size={24} />
            </button>

            <video
              src={selectedMediaUrl}
              controls
              autoPlay
              className="w-full h-full max-h-[90vh] object-contain rounded-lg"
            />

            <button
              onClick={() => {
                const a = document.createElement('a')
                a.href = selectedMediaUrl
                a.download = `video-${Date.now()}`
                a.click()
              }}
              className="absolute bottom-4 right-4 p-2 bg-black/70 hover:bg-black/90 rounded-full transition-colors"
              title="Download"
            >
              <Download size={20} className="text-white" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowNewChat(false)
              setShowGroupChat(false)
              setSearchQuery('')
            }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6"
            >
              {!showGroupChat ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    New Message
                  </h2>

                  {/* Search in modal */}
                  <input
                    type="text"
                    placeholder="Search crew members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 mb-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />

                  {/* Crew list */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredCrewList.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">
                        No crew members found
                      </p>
                    ) : (
                      filteredCrewList.map((member) => (
                        <button
                          key={member.email}
                          onClick={() =>
                            handleStartDirectMessage(member.email, member.name)
                          }
                          className="w-full p-3 text-left bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {member.name}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {member.email}
                          </p>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Group chat button */}
                  <button
                    onClick={() => setShowGroupChat(true)}
                    className="w-full mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={16} />
                    Create Group Chat
                  </button>

                  <button
                    onClick={() => {
                      setShowNewChat(false)
                      setSearchQuery('')
                    }}
                    className="w-full mt-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    Create Group Chat
                  </h2>

                  <input
                    type="text"
                    placeholder="Group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 mb-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Select members ({selectedMembers.size})
                  </p>

                  <div className="max-h-48 overflow-y-auto space-y-2 mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    {crewList.map((member) => (
                      <label
                        key={member.email}
                        className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.email)}
                          onChange={(e) => {
                            const newMembers = new Set(selectedMembers)
                            if (e.target.checked) {
                              newMembers.add(member.email)
                            } else {
                              newMembers.delete(member.email)
                            }
                            setSelectedMembers(newMembers)
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-sm text-slate-900 dark:text-white">{member.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {member.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleCreateGroupChat}
                    disabled={!groupName.trim() || selectedMembers.size === 0}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                  >
                    Create Group
                  </button>

                  <button
                    onClick={() => {
                      setShowGroupChat(false)
                      setGroupName('')
                      setSelectedMembers(new Set())
                    }}
                    className="w-full mt-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors"
                  >
                    Back
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
