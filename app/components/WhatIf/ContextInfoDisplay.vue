<template>
  <div v-if="contextInfo && contextInfo.chunks && contextInfo.chunks.length > 0" class="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
    <!-- Context Summary Header -->
    <button
      @click="toggleExpanded"
      class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 rounded-lg"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <Icon name="ic:baseline-library-books" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              Context Used
            </span>
            <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
              {{ contextInfo.chunksUsed || 0 }} chunks
            </span>
            <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
              {{ contextInfo.documentCoverage || 0 }} documents
            </span>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {{ isExpanded ? 'Click to collapse' : 'Click to view document sources' }}
          </p>
        </div>
      </div>
      <Icon 
        :name="isExpanded ? 'ic:baseline-expand-less' : 'ic:baseline-expand-more'" 
        class="w-5 h-5 text-gray-400" 
      />
    </button>

    <!-- Expanded Context Details -->
    <div v-if="isExpanded" class="border-t border-gray-200 dark:border-gray-600">
      <div class="p-4 space-y-3">
        <!-- Document Groups -->
        <div v-for="(group, filename) in groupedChunks" :key="filename" class="space-y-2">
          <!-- Document Header -->
          <div class="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-600">
            <Icon name="ic:baseline-description" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ filename }}</span>
            <span class="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded">
              {{ group.length }} chunk{{ group.length > 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Chunks from this document -->
          <div class="space-y-2 ml-6">
            <div
              v-for="(chunk, index) in group"
              :key="index"
              class="relative"
            >
              <!-- Chunk Content -->
              <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Chunk {{ index + 1 }}
                  </span>
                  <button
                    @click="copyChunkText(chunk.text)"
                    class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors duration-150"
                    title="Copy chunk text"
                  >
                    <Icon name="ic:baseline-content-copy" class="w-3 h-3" />
                  </button>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {{ chunk.text }}
                </p>
                <!-- Character count -->
                <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {{ chunk.text.length }} characters
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Context Statistics -->
        <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <div class="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {{ contextInfo.chunksUsed || 0 }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">Total Chunks</div>
            </div>
            <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <div class="text-lg font-semibold text-green-600 dark:text-green-400">
                {{ contextInfo.documentCoverage || 0 }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">Documents</div>
            </div>
            <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <div class="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {{ totalCharacters }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">Characters</div>
            </div>
            <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <div class="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {{ averageChunkSize }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">Avg Size</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ContextInfo } from '../../../lib/prompt-history'

interface Props {
  contextInfo: ContextInfo | null | undefined
  defaultExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false
})

// Reactive state
const isExpanded = ref(props.defaultExpanded)

// Toggle expanded state
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

// Group chunks by document filename
const groupedChunks = computed(() => {
  if (!props.contextInfo?.chunks) return {}
  
  const groups: Record<string, ContextInfo['chunks']> = {}
  
  props.contextInfo.chunks.forEach(chunk => {
    const filename = chunk.documentFilename || 'Unknown Document'
    if (!groups[filename]) {
      groups[filename] = []
    }
    groups[filename].push(chunk)
  })
  
  return groups
})

// Calculate total characters across all chunks
const totalCharacters = computed(() => {
  if (!props.contextInfo?.chunks) return 0
  return props.contextInfo.chunks.reduce((total, chunk) => total + (chunk.text?.length || 0), 0)
})

// Calculate average chunk size
const averageChunkSize = computed(() => {
  if (!props.contextInfo?.chunks || props.contextInfo.chunks.length === 0) return 0
  return Math.round(totalCharacters.value / props.contextInfo.chunks.length)
})

// Copy chunk text to clipboard
const copyChunkText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    console.log('Chunk text copied to clipboard')
    // You could add a toast notification here
  } catch (error) {
    console.error('Failed to copy text:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}
</script>

<style scoped>
/* Custom scrollbar for chunk content if needed */
.chunk-content {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175) transparent;
}

.chunk-content::-webkit-scrollbar {
  width: 4px;
}

.chunk-content::-webkit-scrollbar-track {
  background: transparent;
}

.chunk-content::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175);
  border-radius: 2px;
}

.chunk-content::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107 114 128);
}
</style>
