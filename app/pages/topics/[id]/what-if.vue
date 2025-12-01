<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Icon name="ic:baseline-auto-awesome" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">What-If Scenarios</h1>
              <p v-if="topic" class="text-gray-600 dark:text-gray-300">
                Exploring creative possibilities in "<strong>{{ topic.title }}</strong>"
              </p>
            </div>
            <div v-if="topicStats" class="hidden sm:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{{ topicStats.document_count || 0 }} documents</span>
              <span>{{ formatFileSize(topicStats.total_size_bytes || 0) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="showWhatIfModal = true"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <Icon name="ic:baseline-auto-awesome" class="w-4 h-4" />
              New What-If Scenario
            </button>
            <NuxtLink 
              :to="`/topics/${topicId}/chat`"
              class="px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg transition-colors duration-200"
            >
              Quick Chat
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

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
      <!-- Loading State -->
      <div v-if="pending" class="text-center py-12">
        <Icon name="ic:baseline-hourglass-empty" class="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading What-If scenarios...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="ic:baseline-error" class="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Scenarios</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error.message || 'Failed to load What-If scenarios' }}</p>
        <button
          @click="refresh()"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Try Again
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!whatIfScenarios || whatIfScenarios.length === 0" class="text-center py-12">
        <div class="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="ic:baseline-auto-awesome" class="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No What-If Scenarios Yet</h3>
        <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
          Start exploring creative possibilities by generating your first What-If scenario based on your uploaded content.
        </p>
        <button
          @click="showWhatIfModal = true"
          class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          <Icon name="ic:baseline-auto-awesome" class="w-5 h-5" />
          Create Your First Scenario
        </button>
      </div>

      <!-- Scenarios Grid -->
      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="scenario in whatIfScenarios"
          :key="scenario.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer"
          @click="viewScenario(scenario)"
        >
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                <Icon name="ic:baseline-auto-awesome" class="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <h3 class="font-semibold text-gray-900 dark:text-white line-clamp-2">{{ scenario.title }}</h3>
              </div>
              <button
                @click.stop="deleteScenario(scenario.id)"
                class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors duration-150"
                title="Delete scenario"
              >
                <Icon name="ic:baseline-delete" class="w-4 h-4" />
              </button>
            </div>
            
            <p v-if="scenario.prompt" class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {{ scenario.prompt }}
            </p>
            
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-4">
                <span v-if="scenario.word_count">{{ scenario.word_count }} words</span>
                <span>{{ formatDate(scenario.created_at) }}</span>
              </div>
              <div class="flex items-center gap-1">
                <Icon name="ic:baseline-visibility" class="w-3 h-3" />
                <span>View</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More Button -->
      <div v-if="hasMore" class="text-center mt-8">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loadingMore ? 'Loading...' : 'Load More Scenarios' }}
        </button>
      </div>
    </div>

    <!-- What-If Modal (for new scenarios) -->
    <WhatIfModal
      :show="showWhatIfModal"
      :topic="topic"
      :topic-id="topicId"
      @close="showWhatIfModal = false"
      @scenario-generated="handleScenarioGenerated"
      @scenario-saved="handleScenarioSaved"
    />

    <!-- What-If Modal (for viewing/editing existing scenarios) -->
    <WhatIfModal
      :show="!!selectedScenario"
      :topic="topic"
      :topic-id="topicId"
      :existing-scenario="selectedScenario"
      @close="selectedScenario = null"
      @scenario-generated="handleScenarioGenerated"
      @scenario-saved="handleScenarioSaved"
    />
  </div>
</template>

<script setup lang="ts">
import WhatIfModal from '~/components/WhatIf/WhatIfModal.vue'
import type { Topic, TopicStats } from '../../../../types/database'

interface WhatIfScenario {
  id: string
  topic_id: string
  title: string
  prompt: string | null
  content: string | null
  word_count: number | null
  created_at: string
}

// Page metadata
definePageMeta({
  title: 'What-If Scenarios'
})

const route = useRoute()
const topicId = route.params['id'] as string

// Reactive state
const topic = ref<Topic | null>(null)
const topicStats = ref<TopicStats | null>(null)
const whatIfScenarios = ref<WhatIfScenario[]>([])
const showWhatIfModal = ref(false)
const selectedScenario = ref<WhatIfScenario | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)

// Fetch topic data
const { data: topicData, pending, error, refresh } = await useFetch<{
  topic: Topic & { stats?: TopicStats }
}>(`/api/topics/${topicId}`, {
  query: { stats: 'true' },
  server: false
})

// Fetch What-If scenarios
const { data: scenariosData, pending: scenariosPending } = await useFetch<{
  scenarios: WhatIfScenario[]
  hasMore: boolean
}>(`/api/what-if`, {
  query: { topicId, limit: 12 },
  server: false
})

// Watch for data changes
watch(topicData, (newData) => {
  if (newData?.topic) {
    topic.value = newData.topic
    topicStats.value = newData.topic.stats || null
  }
}, { immediate: true })

watch(scenariosData, (newData) => {
  if (newData) {
    whatIfScenarios.value = newData.scenarios || []
    hasMore.value = newData.hasMore || false
  }
}, { immediate: true })

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

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

// Event handlers
const viewScenario = (scenario: WhatIfScenario) => {
  selectedScenario.value = scenario
}

const deleteScenario = async (scenarioId: string) => {
  if (!confirm('Are you sure you want to delete this What-If scenario? This action cannot be undone.')) {
    return
  }

  try {
    await $fetch(`/api/what-if/${scenarioId}`, {
      method: 'DELETE'
    })

    // Remove from local list
    whatIfScenarios.value = whatIfScenarios.value.filter(s => s.id !== scenarioId)
    
    // Close modal if this scenario was selected
    if (selectedScenario.value?.id === scenarioId) {
      selectedScenario.value = null
    }

    console.log('What-If scenario deleted successfully')
  } catch (error) {
    console.error('Error deleting What-If scenario:', error)
    alert('Failed to delete scenario. Please try again.')
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true

  try {
    const offset = whatIfScenarios.value.length
    const response = await $fetch<{
      scenarios: WhatIfScenario[]
      hasMore: boolean
    }>(`/api/what-if`, {
      query: { topicId, limit: 12, offset }
    })

    whatIfScenarios.value.push(...(response.scenarios || []))
    hasMore.value = response.hasMore || false
  } catch (error) {
    console.error('Error loading more scenarios:', error)
  } finally {
    loadingMore.value = false
  }
}

const handleScenarioGenerated = (content: string, metadata: any) => {
  console.log('Scenario generated:', { content, metadata })
}

const handleScenarioSaved = async (scenarioId: string) => {
  console.log('Scenario saved:', scenarioId)
  
  // Close both modals
  showWhatIfModal.value = false
  selectedScenario.value = null
  
  // Refresh the scenarios list
  try {
    const response = await $fetch<{
      scenarios: WhatIfScenario[]
      hasMore: boolean
    }>(`/api/what-if`, {
      query: { topicId, limit: 12 }
    })

    whatIfScenarios.value = response.scenarios || []
    hasMore.value = response.hasMore || false
  } catch (error) {
    console.error('Error refreshing scenarios:', error)
  }
}

// Error handling for missing topic
if (error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Topic not found'
  })
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
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
