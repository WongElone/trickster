<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click="handleBackdropClick">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Context Information</h3>
        <button
          @click="$emit('close')"
          class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <Icon name="ic:baseline-close" class="w-5 h-5" />
        </button>
      </div>
      
      <div v-if="contextInfo" class="space-y-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500 dark:text-gray-400">Context Chunks:</span>
            <span class="ml-2 font-medium">{{ contextInfo.chunks }}</span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">Documents:</span>
            <span class="ml-2 font-medium">{{ documentCoverage }}</span>
          </div>
        </div>
        
        <div v-if="contextInfo.contextSummary">
          <h4 class="font-medium text-gray-900 dark:text-white mb-2">Context Summary</h4>
          <p class="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            {{ contextInfo.contextSummary }}
          </p>
        </div>

        <div v-if="contextInfo.details && contextInfo.details.length > 0">
          <h4 class="font-medium text-gray-900 dark:text-white mb-2">Context Details</h4>
          <div class="space-y-2">
            <div
              v-for="(chunk, index) in contextInfo.details"
              :key="index"
              class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ chunk.document_name || 'Unknown Document' }}
                </div>
                <div v-if="chunk.similarity" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ Math.round(chunk.similarity * 100) }}% match
                </div>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ chunk.text }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ContextInfo {
  chunks: number
  contextSummary?: string
  documentCoverage?: string
  details?: Array<{
    document_name?: string
    text: string
    similarity?: number
  }>
}

interface Props {
  show: boolean
  contextInfo?: ContextInfo | null
}

interface Emits {
  'close': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Computed properties
const documentCoverage = computed(() => {
  if (!props.contextInfo?.details) return '0'
  
  const uniqueDocuments = new Set(
    props.contextInfo.details
      .map(chunk => chunk.document_name)
      .filter(name => name)
  )
  
  return uniqueDocuments.size.toString()
})

// Methods
const handleBackdropClick = () => {
  emit('close')
}

// Handle escape key
onMounted(() => {
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.show) {
      emit('close')
    }
  }
  
  document.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>

<style scoped>
@reference "~/assets/css/main.css";
</style>
