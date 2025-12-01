<template>
  <div class="chat-container h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Chat Messages Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Messages Container -->
      <div class="flex-1 flex flex-col relative">
        <!-- Messages List -->
        <div 
          ref="messagesContainer"
          class="absolute inset-0 overflow-y-auto p-4 space-y-4"
          :class="{ 'pb-32': stickyInput, 'pb-4': !stickyInput }"
          @scroll="handleScroll"
        >
          <!-- Welcome Message -->
          <div v-if="messages.length === 0" class="text-center py-12">
            <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="ic:baseline-chat" class="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ welcomeTitle }}</h3>
            <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {{ welcomeMessage }}
            </p>
          </div>

          <!-- Chat Messages -->
          <ChatMessage
            v-for="(message, index) in messages"
            :key="message.id || index"
            :message="message"
            :is-streaming="!!message.isStreaming"
            :enable-markdown="enableMarkdown"
          />

          <!-- Scroll anchor -->
          <div ref="messagesEnd"></div>
        </div>

        <!-- Input Area -->
        <div v-if="stickyInput" class="absolute bottom-0 left-0 right-0">
          <ChatInput
            ref="chatInputRef"
            v-model="inputMessage"
            :placeholder="inputPlaceholder"
            :disabled="disabled"
            :loading="loading"
            :send-text="sendText"
            :loading-text="loadingText"
            @send="handleSend"
            @keydown="handleInputKeydown"
          />
        </div>
      </div>

      <!-- Settings Sidebar -->
      <ChatSettings
        v-if="showSettings"
        :settings="settings"
        :title="settingsTitle"
        :show-context-window="showContextWindow"
        :show-chat-context-window="showChatContextWindow"
        :show-temperature="showTemperature"
        :show-system-prompt="showSystemPrompt"
        :show-clear-button="showClearButton"
        :show-save-button="showSaveButton"
        :clear-button-text="clearButtonText"
        :save-button-text="saveButtonText"
        @clear="$emit('clear')"
        @save="$emit('save-settings', $event)"
      >
        <template #custom-settings="{ settings }">
          <slot name="custom-settings" :settings="settings"></slot>
        </template>
        <template #actions="{ settings }">
          <slot name="settings-actions" :settings="settings"></slot>
        </template>
      </ChatSettings>
    </div>

    <!-- Non-sticky Input Area -->
    <div v-if="!stickyInput">
      <ChatInput
        ref="chatInputRef"
        v-model="inputMessage"
        :placeholder="inputPlaceholder"
        :disabled="disabled"
        :loading="loading"
        :send-text="sendText"
        :loading-text="loadingText"
        @send="handleSend"
        @keydown="handleInputKeydown"
      />
    </div>

    <!-- Context Modal -->
    <ContextModal
      :show="showContextModal"
      :context-info="selectedContextInfo"
      @close="showContextModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import ChatSettings from './ChatSettings.vue'
import ContextModal from './ContextModal.vue'

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

interface ChatSettings {
  contextWindow: number
  chatContextWindow?: number
  temperature: number
  systemPrompt: string
  [key: string]: any
}

interface Props {
  messages: ChatMessage[]
  settings: ChatSettings
  loading?: boolean
  disabled?: boolean
  showSettings?: boolean
  stickyInput?: boolean
  enableMarkdown?: boolean
  welcomeTitle?: string
  welcomeMessage?: string
  inputPlaceholder?: string
  sendText?: string
  loadingText?: string
  settingsTitle?: string
  showContextWindow?: boolean
  showChatContextWindow?: boolean
  showTemperature?: boolean
  showSystemPrompt?: boolean
  showClearButton?: boolean
  showSaveButton?: boolean
  clearButtonText?: string
  saveButtonText?: string
}

interface Emits {
  'send-message': [message: string]
  'clear': []
  'save-settings': [settings: ChatSettings]
  'scroll': [event: Event]
  'input-keydown': [event: KeyboardEvent]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  showSettings: false,
  stickyInput: true,
  enableMarkdown: true,
  welcomeTitle: 'Start a Conversation',
  welcomeMessage: 'Ask questions or start a discussion. I\'ll provide relevant responses based on the available context.',
  inputPlaceholder: 'Type your message...',
  sendText: 'Send',
  loadingText: 'Sending...',
  settingsTitle: 'Chat Settings',
  showContextWindow: true,
  showChatContextWindow: true,
  showTemperature: true,
  showSystemPrompt: true,
  showClearButton: true,
  showSaveButton: true,
  clearButtonText: 'Clear Chat History',
  saveButtonText: 'Save Settings'
})

const emit = defineEmits<Emits>()

// Refs
const messagesContainer = ref<HTMLElement>()
const messagesEnd = ref<HTMLElement>()
const chatInputRef = ref<InstanceType<typeof ChatInput>>()

// Reactive state
const inputMessage = ref('')
const showContextModal = ref(false)
const selectedContextInfo = ref<any>(null)

// Methods
const handleSend = (message: string) => {
  emit('send-message', message)
  inputMessage.value = ''
}

const handleInputKeydown = (event: KeyboardEvent) => {
  emit('input-keydown', event)
}

const handleScroll = (event: Event) => {
  emit('scroll', event)
}

const scrollToBottom = () => {
  if (messagesEnd.value) {
    messagesEnd.value.scrollIntoView({ behavior: 'smooth' })
  }
}

const focusInput = () => {
  chatInputRef.value?.focus()
}

// Expose methods
defineExpose({
  scrollToBottom,
  focusInput
})

// Auto-scroll when new messages arrive
watch(() => props.messages.length, () => {
  nextTick(() => {
    scrollToBottom()
  })
})
</script>

<style scoped>
.chat-container {
  position: relative;
}
</style>
