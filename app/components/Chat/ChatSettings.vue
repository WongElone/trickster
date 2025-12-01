<template>
  <div class="chat-settings w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
    <div class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ title }}</h3>
      </div>

      <!-- RAG Context Window -->
      <div v-if="showContextWindow">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          RAG Context Window: {{ settings.contextWindow }} chunks
        </label>
        <input
          v-model.number="settings.contextWindow"
          type="range"
          :min="contextWindowMin"
          :max="contextWindowMax"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{{ contextWindowMin }}</span>
          <span>{{ contextWindowMax }}</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Number of document chunks to retrieve for context
        </p>
      </div>

      <!-- Chat Context Window -->
      <div v-if="showChatContextWindow">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chat Context Window: {{ settings.chatContextWindow }} pairs
        </label>
        <input
          v-model.number="settings.chatContextWindow"
          type="range"
          :min="chatContextWindowMin"
          :max="chatContextWindowMax"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{{ chatContextWindowMin }}</span>
          <span>{{ chatContextWindowMax }}</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Number of previous message pairs (user + AI) to remember
        </p>
      </div>

      <!-- Temperature -->
      <div v-if="showTemperature">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Temperature: {{ settings.temperature }}
        </label>
        <input
          v-model.number="settings.temperature"
          type="range"
          :min="temperatureMin"
          :max="temperatureMax"
          :step="temperatureStep"
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{{ temperatureMin }}</span>
          <span>{{ temperatureMax }}</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Controls creativity and randomness of responses
        </p>
      </div>

      <!-- System Prompt -->
      <div v-if="showSystemPrompt">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          System Prompt
        </label>
        <textarea
          v-model="settings.systemPrompt"
          :placeholder="systemPromptPlaceholder"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="4"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Custom instructions for the AI assistant
        </p>
      </div>

      <!-- Custom Settings Slot -->
      <slot name="custom-settings" :settings="settings"></slot>

      <!-- Action Buttons -->
      <div class="space-y-3">
        <slot name="actions" :settings="settings">
          <button
            v-if="showClearButton"
            @click="$emit('clear')"
            class="w-full px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-lg transition-colors duration-200"
          >
            {{ clearButtonText }}
          </button>
          <button
            v-if="showSaveButton"
            @click="$emit('save', settings)"
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            {{ saveButtonText }}
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ChatSettings {
  contextWindow: number
  chatContextWindow?: number
  temperature: number
  systemPrompt: string
  [key: string]: any
}

interface Props {
  settings: ChatSettings
  title?: string
  showContextWindow?: boolean
  showChatContextWindow?: boolean
  showTemperature?: boolean
  showSystemPrompt?: boolean
  showClearButton?: boolean
  showSaveButton?: boolean
  contextWindowMin?: number
  contextWindowMax?: number
  chatContextWindowMin?: number
  chatContextWindowMax?: number
  temperatureMin?: number
  temperatureMax?: number
  temperatureStep?: number
  systemPromptPlaceholder?: string
  clearButtonText?: string
  saveButtonText?: string
}

interface Emits {
  'update:settings': [settings: ChatSettings]
  'clear': []
  'save': [settings: ChatSettings]
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Settings',
  showContextWindow: true,
  showChatContextWindow: true,
  showTemperature: true,
  showSystemPrompt: true,
  showClearButton: true,
  showSaveButton: true,
  contextWindowMin: 1,
  contextWindowMax: 20,
  chatContextWindowMin: 0,
  chatContextWindowMax: 15,
  temperatureMin: 0,
  temperatureMax: 2,
  temperatureStep: 0.1,
  systemPromptPlaceholder: 'Enter custom system prompt (optional)',
  clearButtonText: 'Clear Chat History',
  saveButtonText: 'Save Settings'
})

const emit = defineEmits<Emits>()

// Watch for settings changes and emit updates
watch(() => props.settings, (newSettings) => {
  emit('update:settings', newSettings)
}, { deep: true })
</script>

<style scoped>
.chat-settings {
  flex-shrink: 0;
}
</style>
