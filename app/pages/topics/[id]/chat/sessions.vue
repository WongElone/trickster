<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Back Navigation -->
          <div class="flex items-center gap-4">
            <button
              @click="$router.back()"
              class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon name="ic:baseline-arrow-back" class="w-5 h-5" />
            </button>
            <div>
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Chat Sessions</h1>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ topic?.title || 'Loading...' }}</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <NuxtLink
              :to="`/topics/${topicId}/chat?new=true`"
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              <Icon name="ic:baseline-add" class="w-4 h-4 mr-2" />
              New Chat
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="pending && !topic" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading topic...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div class="flex items-center">
          <Icon name="ic:baseline-error" class="w-6 h-6 text-red-500 mr-3" />
          <div>
            <h3 class="text-lg font-medium text-red-800 dark:text-red-200">Error Loading Topic</h3>
            <p class="text-red-600 dark:text-red-300">{{ error.message || 'Failed to load topic' }}</p>
          </div>
        </div>
      </div>

      <!-- Chat Sessions List -->
      <div v-else>
        <ChatSessionsList
          :topic-id="topicId"
          @session-selected="handleSessionSelected"
          @session-deleted="handleSessionDeleted"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic } from '../../../../../types/database'
import ChatSessionsList from '~/components/Chat/ChatSessionsList.vue'

// Page metadata
definePageMeta({
  title: 'Chat Sessions'
})

const route = useRoute()
const topicId = route.params['id'] as string

// Reactive state
const topic = ref<Topic | null>(null)

// Fetch topic data
const { data: topicData, pending, error } = await useFetch<{
  topic: Topic
}>(`/api/topics/${topicId}`, {
  server: false
})

// Watch for topic data changes
watch(topicData, (newData) => {
  if (newData?.topic) {
    topic.value = newData.topic
  }
}, { immediate: true })

// Event handlers
const handleSessionSelected = (session: any) => {
  console.log('Session selected:', session)
  // Navigation is handled by the ChatSessionsList component
}

const handleSessionDeleted = (sessionId: string) => {
  console.log('Session deleted:', sessionId)
  // Could show a toast notification here
}
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
