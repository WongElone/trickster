<template>
  <div class="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ currentSession?.title || 'Quick Chat' }}
              </h1>
              <p v-if="topic" class="text-gray-600 dark:text-gray-300">
                Chatting about "<strong>{{ topic.title }}</strong>"
                <span v-if="currentSession" class="text-sm">
                  • {{ messages.length }} messages
                </span>
              </p>
            </div>
            <div v-if="topicStats" class="hidden sm:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{{ topicStats.document_count || 0 }} documents</span>
              <span>{{ formatFileSize(topicStats.total_size_bytes || 0) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- Session Management -->
            <NuxtLink
              :to="`/topics/${topicId}/chat/sessions`"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
              title="View All Chat Sessions"
            >
              <Icon name="ic:baseline-chat" class="w-5 h-5" />
            </NuxtLink>
            <button
              @click="startNewSession"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
              title="New Chat Session"
            >
              <Icon name="ic:baseline-add" class="w-5 h-5" />
            </button>
            <button
              @click="showSettings = !showSettings"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
              :title="showSettings ? 'Hide Settings' : 'Show Settings'"
            >
              <Icon name="ic:baseline-settings" class="w-5 h-5" />
            </button>
            <NuxtLink 
              :to="`/topics/${topicId}/what-if`"
              class="px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg transition-colors duration-200"
            >
              What If Mode
            </NuxtLink>
            <NuxtLink 
              :to="`/topics/${topicId}`"
              class="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors duration-200"
            >
              Back to Topic
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Chat Area -->
    <ChatContainer
      ref="chatContainerRef"
      :messages="messages"
      :settings="chatSettings"
      :loading="isLoading"
      :show-settings="showSettings"
      welcome-title="Start a Conversation"
      welcome-message="Ask questions about your uploaded documents or start a creative discussion. I'll use the context from your topic to provide relevant responses."
      input-placeholder="Ask a question or start a conversation..."
      @send-message="handleSendMessage"
      @clear="clearChat"
      @save-settings="saveSettings"
      @scroll="handleScroll"
    />
  </div>
</template>

<script setup lang="ts">
import type { Topic, TopicStats } from '../../../../../types/database'
import ChatContainer from '~/components/Chat/ChatContainer.vue'

// Chat session interfaces
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
  contextInfo?: {
    chunks: number
    details: Array<{
      document_name?: string
      text: string
      similarity?: number
    }>
  }
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
    chatContextWindow: number
    temperature: number
    systemPrompt: string
    maxTokens: number
    topP: number
  }
}

// Page metadata
definePageMeta({
  title: 'Quick Chat'
})

const route = useRoute()
const topicId = route.params['id'] as string

// Reactive state
const topic = ref<Topic | null>(null)
const topicStats = ref<TopicStats | null>(null)
const messages = ref<ChatMessage[]>([])

const isLoading = ref(false)
const showSettings = ref(false)

// Chat settings
const chatSettings = reactive({
  contextWindow: 8,
  chatContextWindow: 5, // Number of previous message pairs to remember
  temperature: 0.7,
  systemPrompt: ''
})

// Refs for components
const chatContainerRef = ref<InstanceType<typeof ChatContainer>>()

// Session management
const currentSession = ref<ChatSession | null>(null)
const sessionId = ref<string | null>(null)

// Local storage key for this topic's chat history
const chatStorageKey = `trickster_chat_${topicId}`

// Fetch topic data
const { data: topicData, pending, error } = await useFetch<{
  topic: Topic & { stats?: TopicStats }
}>(`/api/topics/${topicId}`, {
  query: { stats: 'true' },
  server: false
})

// Watch for topic data changes
watch(topicData, (newData) => {
  if (newData?.topic) {
    topic.value = newData.topic
    topicStats.value = newData.topic.stats || null
  }
}, { immediate: true })

// Load chat settings on mount (session loading is handled in session initialization)
onMounted(() => {
  loadChatSettings()
  
  // Focus chat input
  nextTick(() => {
    chatContainerRef.value?.focusInput()
  })
})

// Note: Chat history is now saved via session management (saveCurrentSession)

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMessage = (content: string): string => {
  // Simple markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

const generateMessageId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

// Note: Chat history management is now handled by session management functions

const loadChatSettings = () => {
  try {
    const stored = localStorage.getItem(`${chatStorageKey}_settings`)
    if (stored) {
      const settings = JSON.parse(stored)
      Object.assign(chatSettings, settings)
    }
  } catch (error) {
    console.error('Failed to load chat settings:', error)
  }
}

const saveChatSettings = () => {
  try {
    localStorage.setItem(`${chatStorageKey}_settings`, JSON.stringify(chatSettings))
  } catch (error) {
    console.error('Failed to save chat settings:', error)
  }
}

// Message handling
const handleSendMessage = async (messageText: string) => {
  await sendMessage(messageText)
}

const sendMessage = async (messageText: string) => {
  if (!messageText.trim() || isLoading.value) return

  const userMessage = {
    id: generateMessageId(),
    role: 'user' as const,
    content: messageText.trim(),
    timestamp: new Date().toISOString()
  }

  // Add user message
  messages.value.push(userMessage)
  
  // Always scroll to bottom when user sends a message
  nextTick(() => {
    scrollToBottom()
  })

  // Create assistant message placeholder
  const assistantMessage = {
    id: generateMessageId(),
    role: 'assistant' as const,
    content: '',
    timestamp: new Date().toISOString(),
    isStreaming: true,
    contextInfo: undefined as any
  }
  
  messages.value.push(assistantMessage)
  isLoading.value = true

  try {
    // Prepare conversation history based on chat context window setting
    // Exclude the current user message and the streaming assistant message
    const conversationHistory = prepareConversationHistory(messages.value.slice(0, -2), chatSettings.chatContextWindow)

    // Use POST API for streaming with conversation history support
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messageText.trim(),
        topicId: topicId,
        conversationHistory: conversationHistory,
        contextWindow: chatSettings.contextWindow,
        temperature: chatSettings.temperature,
        systemPrompt: chatSettings.systemPrompt || '',
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    let fullResponse = ''
    let contextInfo: any = null

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode the chunk
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('Streaming data received:', data)

              if (data.type === 'context') {
                contextInfo = {
                  chunks: data.contextChunks || 0,
                  details: data.contextDetails || []
                }
              } else if (data.type === 'content') {
                fullResponse += data.content
                
                // Find and update the assistant message in the reactive array
                const messageIndex = messages.value.findIndex(msg => msg.id === assistantMessage.id)
                if (messageIndex !== -1 && messages.value[messageIndex]) {
                  messages.value[messageIndex].content = fullResponse
                }
                
                // Only auto-scroll if user is already near the bottom
                nextTick(() => {
                  scrollToBottomIfNeeded()
                })
              } else if (data.type === 'complete') {
                // Find and update the assistant message in the reactive array
                const messageIndex = messages.value.findIndex(msg => msg.id === assistantMessage.id)
                if (messageIndex !== -1 && messages.value[messageIndex]) {
                  messages.value[messageIndex].isStreaming = false
                  messages.value[messageIndex].contextInfo = contextInfo
                }
                isLoading.value = false
                console.log('Streaming completed. Full response:', fullResponse)
                return // Exit the streaming loop
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError, 'Line:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

  } catch (error) {
    console.error('Error sending message:', error)
    assistantMessage.content = 'Sorry, there was an error sending your message. Please try again.'
    assistantMessage.isStreaming = false
    isLoading.value = false
  }
}

// UI event handlers (now handled by ChatContainer)
const scrollToBottom = () => {
  chatContainerRef.value?.scrollToBottom()
}

const scrollToBottomIfNeeded = () => {
  // Disabled auto-scroll as requested by user
  return
}

const handleScroll = () => {
  // Could implement scroll-based features here (e.g., load more messages)
}

// Session management functions
const generateSessionId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

const generateSessionTitle = (firstMessage: string): string => {
  const words = firstMessage.trim().split(/\s+/).slice(0, 6)
  return words.join(' ') + (firstMessage.split(/\s+/).length > 6 ? '...' : '')
}

const prepareConversationHistory = (allMessages: ChatMessage[], chatContextPairs: number): Array<{role: 'user' | 'assistant', content: string}> => {
  if (chatContextPairs === 0) return []
  
  // Filter out streaming messages and get only completed user/assistant messages
  const completedMessages = allMessages.filter(msg => !msg.isStreaming && msg.content.trim())
  
  // Ensure we have complete pairs by working backwards from the end
  const pairs: Array<{role: 'user' | 'assistant', content: string}> = []
  let userMessage: ChatMessage | null = null
  let assistantMessage: ChatMessage | null = null
  
  // Process messages in reverse to find complete pairs
  for (let i = completedMessages.length - 1; i >= 0 && pairs.length < chatContextPairs * 2; i--) {
    const msg = completedMessages[i]
    if (!msg) continue
    
    if (msg.role === 'assistant' && !assistantMessage) {
      assistantMessage = msg
    } else if (msg.role === 'user' && assistantMessage && !userMessage) {
      userMessage = msg
      
      // We have a complete pair, add them in chronological order
      pairs.unshift(
        { role: 'user', content: userMessage.content },
        { role: 'assistant', content: assistantMessage.content }
      )
      
      // Reset for next pair
      userMessage = null
      assistantMessage = null
    }
  }
  
  // Return only the requested number of pairs
  const maxMessages = chatContextPairs * 2
  return pairs.slice(-maxMessages)
}

const startNewSession = () => {
  // Save current session if exists
  if (currentSession.value) {
    saveCurrentSession()
  }
  
  // Create new session
  const newSessionId = generateSessionId()
  sessionId.value = newSessionId
  
  const newSession: ChatSession = {
    id: newSessionId,
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
    messageCount: 0,
    messages: [],
    settings: {
      contextWindow: chatSettings.contextWindow,
      chatContextWindow: chatSettings.chatContextWindow,
      temperature: chatSettings.temperature,
      systemPrompt: chatSettings.systemPrompt,
      maxTokens: 1000,
      topP: 1.0
    }
  }
  
  currentSession.value = newSession
  messages.value = []
  
  // Update URL without navigation
  const router = useRouter()
  router.replace({ query: { session: newSessionId } })
}

const loadSession = (sessionIdToLoad: string) => {
  try {
    const storedData = localStorage.getItem(chatStorageKey)
    if (storedData) {
      const chatData = JSON.parse(storedData)
      if (chatData.conversations) {
        const session = chatData.conversations.find((conv: any) => conv.id === sessionIdToLoad)
        if (session) {
          currentSession.value = {
            id: session.id,
            title: session.title || generateSessionTitle(session.messages[0]?.content || 'New Chat'),
            createdAt: session.createdAt || new Date().toISOString(),
            lastMessageAt: session.lastMessageAt || new Date().toISOString(),
            messageCount: session.messages?.length || 0,
            messages: session.messages || [],
            settings: session.settings
          }
          
          messages.value = session.messages || []
          
          // Load session settings
          if (session.settings) {
            Object.assign(chatSettings, session.settings)
          }
          
          sessionId.value = sessionIdToLoad
          return true
        }
      }
    }
  } catch (error) {
    console.error('Failed to load session:', error)
  }
  return false
}

const saveCurrentSession = () => {
  if (!currentSession.value) return
  
  try {
    // Update current session data
    currentSession.value.messages = [...messages.value]
    currentSession.value.messageCount = messages.value.length
    currentSession.value.lastMessageAt = new Date().toISOString()
    
    // Update title if it's still "New Chat" and we have messages
    if (currentSession.value.title === 'New Chat' && messages.value.length > 0) {
      const firstUserMessage = messages.value.find(msg => msg.role === 'user')
      if (firstUserMessage) {
        currentSession.value.title = generateSessionTitle(firstUserMessage.content)
      }
    }
    
    // Get existing data
    const storedData = localStorage.getItem(chatStorageKey)
    let chatData: { conversations: ChatSession[] } = { conversations: [] }
    
    if (storedData) {
      chatData = JSON.parse(storedData)
    }
    
    if (!chatData.conversations) {
      chatData.conversations = []
    }
    
    // Update or add session
    const existingIndex = chatData.conversations.findIndex((conv: ChatSession) => conv.id === currentSession.value!.id)
    if (existingIndex >= 0) {
      chatData.conversations[existingIndex] = currentSession.value
    } else {
      chatData.conversations.push(currentSession.value)
    }
    
    // Save to localStorage
    localStorage.setItem(chatStorageKey, JSON.stringify(chatData))
  } catch (error) {
    console.error('Failed to save session:', error)
  }
}

// Context info is now handled by ChatContainer

const clearChat = () => {
  if (confirm('Are you sure you want to clear the current chat session? This action cannot be undone.')) {
    if (currentSession.value) {
      // Clear current session messages
      messages.value = []
      currentSession.value.messages = []
      currentSession.value.messageCount = 0
      
      // Save the cleared session
      saveCurrentSession()
    }
  }
}

const saveSettings = () => {
  saveChatSettings()
  // Could show a toast notification here
  console.log('Settings saved')
}

// Smart auto-scroll when new messages arrive (only if user is near bottom)
watch(messages, () => {
  nextTick(() => {
    scrollToBottomIfNeeded()
  })
}, { deep: true })

// Initialize session on mount
onMounted(() => {
  // Check if there's a session ID in the URL
  const urlSessionId = route.query['session'] as string
  const forceNew = route.query['new'] === 'true'
  
  if (forceNew) {
    // Force create a new session
    startNewSession()
  } else if (urlSessionId) {
    // Try to load the specific session
    const loaded = loadSession(urlSessionId)
    if (!loaded) {
      // Session not found, start new session
      startNewSession()
    }
  } else {
    // No session specified, load the most recent session or start new
    const storedData = localStorage.getItem(chatStorageKey)
    if (storedData) {
      try {
        const chatData = JSON.parse(storedData)
        if (chatData.conversations && chatData.conversations.length > 0) {
          // New multi-session format - Load the most recent session
          const mostRecent = chatData.conversations.reduce((latest: any, current: any) => {
            return new Date(current.lastMessageAt) > new Date(latest.lastMessageAt) ? current : latest
          })
          loadSession(mostRecent.id)
        } else if (chatData.messages && Array.isArray(chatData.messages) && chatData.messages.length > 0) {
          // Legacy single-session format - migrate to new format
          console.log('Migrating legacy chat data to new session format')
          const legacySessionId = generateSessionId()
          const firstUserMessage = chatData.messages.find((msg: any) => msg.role === 'user')
          const legacySession = {
            id: legacySessionId,
            title: firstUserMessage ? generateSessionTitle(firstUserMessage.content) : 'Legacy Chat',
            createdAt: chatData.messages[0]?.timestamp || new Date().toISOString(),
            lastMessageAt: chatData.messages[chatData.messages.length - 1]?.timestamp || new Date().toISOString(),
            messageCount: chatData.messages.length,
            messages: chatData.messages,
            settings: {
              contextWindow: chatSettings.contextWindow,
              chatContextWindow: chatSettings.chatContextWindow,
              temperature: chatSettings.temperature,
              systemPrompt: chatSettings.systemPrompt,
              maxTokens: 1000,
              topP: 1.0
            }
          }
          
          // Save in new format
          const newChatData = { conversations: [legacySession] }
          localStorage.setItem(chatStorageKey, JSON.stringify(newChatData))
          
          // Load the migrated session
          loadSession(legacySessionId)
        } else {
          startNewSession()
        }
      } catch (error) {
        console.error('Failed to parse stored chat data:', error)
        startNewSession()
      }
    } else {
      startNewSession()
    }
  }
})

// Watch for messages changes to auto-save session
watch(messages, () => {
  if (currentSession.value) {
    saveCurrentSession()
  }
}, { deep: true })

// Handle navigation guard
onBeforeRouteLeave(() => {
  // Save current session
  if (currentSession.value) {
    saveCurrentSession()
  }
  return true
})

// Error handling for missing topic
if (error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Topic not found'
  })
}
</script>
