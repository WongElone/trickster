<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="$emit('close')"
    ></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
      <div 
        class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Icon name="ic:baseline-history" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Prompt History</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ historyItems.length }} previous prompts and generated content
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="historyItems.length > 0"
              @click="clearAllHistory"
              class="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-lg transition-colors duration-200"
            >
              Clear All
            </button>
            <button
              @click="$emit('close')"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors duration-150"
            >
              <Icon name="ic:baseline-close" class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto">
          <!-- Empty State -->
          <div v-if="historyItems.length === 0" class="text-center py-12">
            <div class="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="ic:baseline-history" class="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Prompt History</h3>
            <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Your previous prompts and generated content will appear here for easy reuse and reference.
            </p>
          </div>

          <!-- History List -->
          <div v-else class="p-6 space-y-4">
            <div
              v-for="item in historyItems"
              :key="item.id"
              class="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <!-- Item Header -->
              <div class="p-4 border-b border-gray-200 dark:border-gray-600">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <Icon name="ic:baseline-auto-awesome" class="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ formatHistoryTimestamp(item.timestamp) }}
                      </span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        {{ item.wordCount }} words
                      </span>
                      <span v-if="item.contextInfo" class="text-xs text-gray-500 dark:text-gray-400">
                        {{ item.contextInfo.chunksUsed }} chunks
                      </span>
                    </div>
                    <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {{ item.prompt }}
                    </p>
                  </div>
                  <div class="flex items-center gap-1 ml-4">
                    <!-- Use Prompt Button -->
                    <button
                      @click="usePrompt(item)"
                      class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-150"
                      title="Use this prompt"
                    >
                      <Icon name="ic:baseline-edit" class="w-4 h-4" />
                    </button>
                    <!-- Save to Database Button -->
                    <button
                      @click="saveToDatabase(item)"
                      :disabled="savingItems.has(item.id)"
                      class="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save to database"
                    >
                      <Icon 
                        :name="savingItems.has(item.id) ? 'ic:baseline-hourglass-empty' : 'ic:baseline-save'" 
                        class="w-4 h-4"
                        :class="{ 'animate-spin': savingItems.has(item.id) }"
                      />
                    </button>
                    <!-- Delete Button -->
                    <button
                      @click="deleteItem(item)"
                      class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-150"
                      title="Delete from history"
                    >
                      <Icon name="ic:baseline-delete" class="w-4 h-4" />
                    </button>
                    <!-- Expand/Collapse Button -->
                    <button
                      @click="toggleExpanded(item.id)"
                      class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-150"
                      :title="expandedItems.has(item.id) ? 'Collapse' : 'Expand'"
                    >
                      <Icon 
                        :name="expandedItems.has(item.id) ? 'ic:baseline-expand-less' : 'ic:baseline-expand-more'" 
                        class="w-4 h-4" 
                      />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Expanded Content -->
              <div v-if="expandedItems.has(item.id)" class="p-4 space-y-4">
                <!-- Full Prompt -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Original Prompt:</h4>
                  <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ item.prompt }}</p>
                  </div>
                </div>

                <!-- Generated Content -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Generated Content:</h4>
                  <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 max-h-64 overflow-y-auto">
                    <div class="prose prose-sm prose-purple dark:prose-invert max-w-none">
                      <div v-html="formatContent(item.generatedContent)"></div>
                    </div>
                  </div>
                </div>

                <!-- Context Information -->
                <ContextInfoDisplay 
                  :context-info="item.contextInfo" 
                  :default-expanded="false"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ContextInfoDisplay from './ContextInfoDisplay.vue'
import { 
  loadPromptHistory, 
  deletePromptHistoryItem, 
  clearPromptHistory, 
  formatHistoryTimestamp,
  type PromptHistoryItem,
  type ContextInfo
} from '../../../lib/prompt-history'

interface Props {
  show: boolean
  scenarioId: string
}

interface Emits {
  'close': []
  'use-prompt': [item: PromptHistoryItem]
  'save-to-database': [item: PromptHistoryItem]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const historyItems = ref<PromptHistoryItem[]>([])
const expandedItems = ref<Set<string>>(new Set())
const savingItems = ref<Set<string>>(new Set())

// Load history when component mounts or scenarioId changes
const loadHistory = () => {
  const history = loadPromptHistory(props.scenarioId)
  historyItems.value = history.items
}

// Toggle expanded state for an item
const toggleExpanded = (itemId: string) => {
  if (expandedItems.value.has(itemId)) {
    expandedItems.value.delete(itemId)
  } else {
    expandedItems.value.add(itemId)
  }
}


// Use prompt - emit to parent
const usePrompt = (item: PromptHistoryItem) => {
  emit('use-prompt', item)
}

// Save to database - emit to parent and handle loading state
const saveToDatabase = async (item: PromptHistoryItem) => {
  savingItems.value.add(item.id)
  try {
    emit('save-to-database', item)
    // Note: The parent component should handle the actual saving and success/error feedback
  } finally {
    // Remove loading state after a delay to show feedback
    setTimeout(() => {
      savingItems.value.delete(item.id)
    }, 1000)
  }
}

// Delete item from history
const deleteItem = (item: PromptHistoryItem) => {
  if (confirm('Are you sure you want to delete this prompt from history? This action cannot be undone.')) {
    deletePromptHistoryItem(props.scenarioId, item.id)
    loadHistory() // Reload history
  }
}

// Clear all history
const clearAllHistory = () => {
  if (confirm('Are you sure you want to clear all prompt history? This action cannot be undone.')) {
    clearPromptHistory(props.scenarioId)
    loadHistory() // Reload history
    expandedItems.value.clear()
  }
}

// Format content for display
const formatContent = (content: string): string => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)/, '<p>$1')
    .replace(/(.+)$/, '$1</p>')
}

// Watch for show prop changes to reload history
watch(() => props.show, (newShow) => {
  if (newShow) {
    loadHistory()
  }
})

// Watch for scenarioId changes to reload history
watch(() => props.scenarioId, () => {
  if (props.show) {
    loadHistory()
  }
})

// Load history on mount
onMounted(() => {
  loadHistory()
})
</script>

<style scoped>

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prose-purple {
  --tw-prose-links: rgb(147 51 234);
  --tw-prose-headings: rgb(88 28 135);
  --tw-prose-bold: rgb(88 28 135);
  --tw-prose-counters: rgb(147 51 234);
  --tw-prose-bullets: rgb(196 181 253);
  --tw-prose-hr: rgb(233 213 255);
  --tw-prose-quotes: rgb(88 28 135);
  --tw-prose-quote-borders: rgb(196 181 253);
  --tw-prose-captions: rgb(107 114 128);
  --tw-prose-code: rgb(88 28 135);
  --tw-prose-pre-code: rgb(233 213 255);
  --tw-prose-pre-bg: rgb(59 7 100);
  --tw-prose-th-borders: rgb(196 181 253);
  --tw-prose-td-borders: rgb(233 213 255);
}
</style>
