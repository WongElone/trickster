<template>
  <div class="chat-sessions-list">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Chat Sessions</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ sessions.length }} session{{ sessions.length !== 1 ? 's' : '' }} found
        </p>
      </div>
      <button
        @click="refreshSessions"
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
      >
        <Icon name="ic:baseline-refresh" class="w-4 h-4 mr-2" />
        Refresh
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="sessions.length === 0" class="text-center py-12">
      <Icon name="ic:baseline-chat" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Chat Sessions</h3>
      <p class="text-gray-600 dark:text-gray-400 mb-6">Start a conversation to create your first chat session.</p>
      <NuxtLink
        :to="`/topics/${topicId}/chat`"
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
      >
        <Icon name="ic:baseline-add" class="w-4 h-4 mr-2" />
        Start New Chat
      </NuxtLink>
    </div>

    <!-- Sessions List -->
    <div v-else class="space-y-4">
      <!-- Search and Filter -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex-1 relative">
          <Icon name="ic:baseline-search" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search chat sessions..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          v-model="sortBy"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title">Title A-Z</option>
          <option value="messages">Most Messages</option>
        </select>
      </div>

      <!-- Sessions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
          @click="openSession(session)"
        >
          <div class="p-4">
            <!-- Session Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ session.title }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ formatDate(session.createdAt) }}
                </p>
              </div>
              <div class="flex items-center gap-1 ml-2">
                <button
                  @click.stop="deleteSession(session)"
                  class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  :title="`Delete ${session.title}`"
                >
                  <Icon name="ic:baseline-delete" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Session Preview -->
            <div class="mb-3">
              <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ getSessionPreview(session) }}
              </p>
            </div>

            <!-- Session Stats -->
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <Icon name="ic:baseline-chat" class="w-3 h-3" />
                  {{ session.messageCount }} messages
                </span>
                <span class="flex items-center gap-1">
                  <Icon name="ic:baseline-access-time" class="w-3 h-3" />
                  {{ formatRelativeTime(session.lastMessageAt) }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <div
                  class="w-2 h-2 rounded-full"
                  :class="session.messageCount > 0 ? 'bg-green-400' : 'bg-gray-300'"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="text-center pt-6">
        <button
          @click="loadMore"
          :disabled="loading"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Icon v-if="loading" name="ic:baseline-refresh" class="w-4 h-4 mr-2 animate-spin inline" />
          {{ loading ? 'Loading...' : 'Load More Sessions' }}
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="sessionToDelete"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="cancelDelete"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        @click.stop
      >
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Icon name="ic:baseline-warning" class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete Chat Session</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">This action cannot be undone.</p>
          </div>
        </div>
        
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to delete the chat session "<strong>{{ sessionToDelete.title }}</strong>"? 
          All messages in this session will be permanently removed.
        </p>
        
        <div class="flex items-center justify-end gap-3">
          <button
            @click="cancelDelete"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
          >
            Delete Session
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
  messages: ChatMessage[]
  settings?: {
    contextWindow: number
    temperature: number
    systemPrompt: string
  }
}

interface Props {
  topicId: string
}

interface Emits {
  'session-selected': [session: ChatSession]
  'session-deleted': [sessionId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const sessions = ref<ChatSession[]>([])
const searchQuery = ref('')
const sortBy = ref('newest')
const loading = ref(false)
const hasMore = ref(false)
const sessionToDelete = ref<ChatSession | null>(null)

// Computed properties
const filteredSessions = computed(() => {
  let filtered = sessions.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(session =>
      session.title.toLowerCase().includes(query) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(query))
    )
  }

  // Apply sorting
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'newest':
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      case 'oldest':
        return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      case 'messages':
        return b.messageCount - a.messageCount
      default:
        return 0
    }
  })

  return filtered
})

// Methods
const loadSessions = () => {
  try {
    const storageKey = `trickster_chat_${props.topicId}`
    const storedData = localStorage.getItem(storageKey)
    
    if (storedData) {
      const chatData = JSON.parse(storedData)
      if (chatData.conversations && Array.isArray(chatData.conversations)) {
        sessions.value = chatData.conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.title || generateTitleFromMessages(conv.messages),
          createdAt: conv.createdAt || (conv.messages[0]?.timestamp || new Date().toISOString()),
          lastMessageAt: conv.lastMessageAt || (conv.messages[conv.messages.length - 1]?.timestamp || new Date().toISOString()),
          messageCount: conv.messages?.length || 0,
          messages: conv.messages || [],
          settings: conv.settings
        }))
      }
    }
  } catch (error) {
    console.error('Failed to load chat sessions:', error)
  }
}

const generateTitleFromMessages = (messages: ChatMessage[]): string => {
  if (!messages || messages.length === 0) return 'New Chat'
  
  const firstUserMessage = messages.find(msg => msg.role === 'user')
  if (firstUserMessage) {
    // Take first few words of the first user message
    const words = firstUserMessage.content.trim().split(/\s+/).slice(0, 6)
    return words.join(' ') + (firstUserMessage.content.split(/\s+/).length > 6 ? '...' : '')
  }
  
  return 'New Chat'
}

const refreshSessions = () => {
  loadSessions()
}

const openSession = (session: ChatSession) => {
  emit('session-selected', session)
  // Navigate to chat page with session ID
  navigateTo(`/topics/${props.topicId}/chat?session=${session.id}`)
}

const deleteSession = (session: ChatSession) => {
  sessionToDelete.value = session
}

const confirmDelete = () => {
  if (!sessionToDelete.value) return
  
  try {
    const storageKey = `trickster_chat_${props.topicId}`
    const storedData = localStorage.getItem(storageKey)
    
    if (storedData) {
      const chatData = JSON.parse(storedData)
      if (chatData.conversations) {
        chatData.conversations = chatData.conversations.filter(
          (conv: any) => conv.id !== sessionToDelete.value!.id
        )
        localStorage.setItem(storageKey, JSON.stringify(chatData))
      }
    }
    
    // Remove from local state
    sessions.value = sessions.value.filter(s => s.id !== sessionToDelete.value!.id)
    
    emit('session-deleted', sessionToDelete.value.id)
    sessionToDelete.value = null
  } catch (error) {
    console.error('Failed to delete session:', error)
  }
}

const cancelDelete = () => {
  sessionToDelete.value = null
}

const loadMore = () => {
  // Placeholder for pagination if needed
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
}

const getSessionPreview = (session: ChatSession): string => {
  if (session.messages.length === 0) return 'No messages yet'
  
  const lastMessage = session.messages[session.messages.length - 1]
  if (!lastMessage) return 'No messages yet'
  return lastMessage.content.length > 100 
    ? lastMessage.content.substring(0, 100) + '...'
    : lastMessage.content
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

// Load sessions on mount
onMounted(() => {
  loadSessions()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
