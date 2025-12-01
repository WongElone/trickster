<template>
  <div class="chat-input border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
    <div class="flex gap-3">
      <div class="flex-1">
        <textarea
          ref="textareaRef"
          v-model="inputValue"
          :placeholder="placeholder"
          class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows="1"
          :disabled="disabled"
          @keydown="handleKeyDown"
          @input="adjustHeight"
        />
      </div>
      <button
        @click="handleSend"
        :disabled="!canSend"
        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        <Icon v-if="loading" name="ic:baseline-refresh" class="w-4 h-4 animate-spin" />
        <Icon v-else name="ic:baseline-send" class="w-4 h-4" />
        {{ loading ? loadingText : sendText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  sendText?: string
  loadingText?: string
  maxHeight?: number
}

interface Emits {
  'update:modelValue': [value: string]
  'send': [message: string]
  'keydown': [event: KeyboardEvent]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type your message...',
  disabled: false,
  loading: false,
  sendText: 'Send',
  loadingText: 'Sending...',
  maxHeight: 120
})

const emit = defineEmits<Emits>()

// Refs
const textareaRef = ref<HTMLTextAreaElement>()

// Computed properties
const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const canSend = computed(() => {
  return inputValue.value.trim() && !props.disabled && !props.loading
})

// Methods
const handleKeyDown = (event: KeyboardEvent) => {
  emit('keydown', event)
  
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

const handleSend = () => {
  if (canSend.value) {
    emit('send', inputValue.value.trim())
  }
}

const adjustHeight = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, props.maxHeight) + 'px'
  }
}

// Focus method (exposed for parent components)
const focus = () => {
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

// Expose methods
defineExpose({
  focus
})

// Auto-adjust height on mount
onMounted(() => {
  adjustHeight()
})
</script>

<style scoped>
/* Positioning handled by parent container */
</style>
