<template>
  <div class="chat-message" :class="messageClass">
    <!-- User Message -->
    <div v-if="message.role === 'user'" class="flex justify-end mb-4">
      <div class="flex items-start gap-3 max-w-3xl">
        <div class="flex-1 min-w-0">
          <div class="bg-blue-600 text-white rounded-lg px-4 py-3 shadow-sm">
            <div class="whitespace-pre-wrap break-words">{{ message.content }}</div>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Icon name="ic:baseline-person" class="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>

    <!-- Assistant Message -->
    <div v-else class="flex justify-start mb-4">
      <div class="flex items-start gap-3 max-w-3xl">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-gray-600 dark:bg-gray-400 rounded-full flex items-center justify-center">
            <Icon name="ic:baseline-computer" class="w-4 h-4 text-white dark:text-gray-800" />
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 shadow-sm">
            <!-- Streaming indicator -->
            <div v-if="isStreaming" class="flex items-center gap-2 mb-2">
              <div class="flex gap-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
              </div>
              <span class="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
            </div>
            
            <!-- Message content with markdown support -->
            <div class="prose prose-sm dark:prose-invert max-w-none">
              <div v-if="formattedContent" v-html="formattedContent" class="whitespace-pre-wrap break-words"></div>
              <div v-else class="whitespace-pre-wrap break-words text-gray-900 dark:text-white">{{ displayContent }}</div>
            </div>
            
            <!-- Streaming cursor -->
            <span v-if="isStreaming" class="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
          </div>
          
          <!-- Message metadata -->
          <div class="flex items-center justify-between mt-1">
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatTime(message.timestamp) }}
            </div>
            <div v-if="contextInfo" class="flex items-center gap-2">
              <button
                @click="showContext = !showContext"
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {{ contextInfo.chunks }} context chunks
              </button>
            </div>
          </div>
          
          <!-- Context information -->
          <div v-if="showContext && contextInfo" class="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Context Used:</div>
            <div class="space-y-2">
              <div
                v-for="(chunk, index) in contextInfo.details"
                :key="index"
                class="text-xs p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
              >
                <div class="font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Document: {{ chunk.document_name || 'Unknown' }}
                </div>
                <div class="text-gray-500 dark:text-gray-400 truncate">
                  {{ chunk.text.substring(0, 100) }}{{ chunk.text.length > 100 ? '...' : '' }}
                </div>
              </div>
            </div>
          </div>
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
  contextInfo?: {
    chunks: number
    details: Array<{
      document_name?: string
      text: string
      similarity?: number
    }>
  }
}

interface Props {
  message: ChatMessage
  isStreaming?: boolean
  enableMarkdown?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  enableMarkdown: true
})

// Reactive state
const showContext = ref(false)

// Computed properties
const messageClass = computed(() => ({
  'chat-message--user': props.message.role === 'user',
  'chat-message--assistant': props.message.role === 'assistant',
  'chat-message--streaming': props.isStreaming
}))

const displayContent = computed(() => {
  return props.message.content
})

const formattedContent = computed(() => {
  if (!props.enableMarkdown) return null
  
  // Simple markdown formatting (can be enhanced with a proper markdown library)
  let content = props.message.content
  
  // Bold text
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Italic text
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // Code blocks
  content = content.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>')
  
  // Line breaks
  content = content.replace(/\n/g, '<br>')
  
  return content
})

const contextInfo = computed(() => {
  return props.message.contextInfo
})

// Utility functions
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.chat-message {
  width: 100%;
}

.chat-message--streaming .animate-bounce {
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

/* Prose styling for markdown content */
.prose code {
  background-color: rgb(243 244 246);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.dark .prose code {
  background-color: rgb(55 65 81);
}

.prose strong {
  font-weight: 600;
  color: rgb(17 24 39);
}

.dark .prose strong {
  color: rgb(255 255 255);
}

.prose em {
  font-style: italic;
  color: rgb(31 41 55);
}

.dark .prose em {
  color: rgb(229 231 235);
}
</style>
