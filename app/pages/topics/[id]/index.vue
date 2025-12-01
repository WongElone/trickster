<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <NuxtLink 
              to="/topics"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
              title="Back to Topics"
            >
              <Icon name="ic:baseline-arrow-back" class="w-5 h-5" />
            </NuxtLink>
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ topic?.title || 'Loading...' }}</h1>
              <p v-if="topic?.description" class="text-gray-600 dark:text-gray-300 mt-1">{{ topic.description }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="showEditModal = true"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
            >
              Edit Topic
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Topic Overview -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Statistics Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div class="flex items-center">
                <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Icon name="ic:baseline-description" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Documents</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ topicStats?.document_count || 0 }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div class="flex items-center">
                <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Icon name="ic:baseline-chat" class="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Chat Sessions</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ chatSessionCount }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div class="flex items-center">
                <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Icon name="ic:baseline-lightbulb" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-600 dark:text-gray-400">What-If Scenarios</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ topicStats?.what_if_count || 0 }}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Action Panel -->
        <div class="space-y-6">
          <!-- Quick Actions -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div class="space-y-3">
              <NuxtLink
                :to="`/topics/${topicId}/documents`"
                class="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200"
              >
                <Icon name="ic:baseline-description" class="w-5 h-5" />
                <div>
                  <p class="font-medium">View Documents</p>
                  <p class="text-sm opacity-75">Manage uploaded files and embeddings</p>
                </div>
              </NuxtLink>

              <NuxtLink
                :to="`/topics/${topicId}/upload`"
                class="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors duration-200"
              >
                <Icon name="ic:baseline-cloud-upload" class="w-5 h-5" />
                <div>
                  <p class="font-medium">Upload Documents</p>
                  <p class="text-sm opacity-75">Add new files to this topic</p>
                </div>
              </NuxtLink>

              <NuxtLink
                :to="`/topics/${topicId}/chat?new=true`"
                class="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg transition-colors duration-200"
              >
                <Icon name="ic:baseline-chat" class="w-5 h-5" />
                <div>
                  <p class="font-medium">Quick Chat</p>
                  <p class="text-sm opacity-75">Chat with your documents</p>
                </div>
              </NuxtLink>

              <NuxtLink
                :to="`/topics/${topicId}/chat/sessions`"
                class="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors duration-200"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                <div>
                  <p class="font-medium">Chat History</p>
                  <p class="text-sm opacity-75">View all chat sessions</p>
                </div>
              </NuxtLink>

              <NuxtLink
                :to="`/topics/${topicId}/what-if`"
                class="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg transition-colors duration-200"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <div>
                  <p class="font-medium">What-If Mode</p>
                  <p class="text-sm opacity-75">Generate creative scenarios</p>
                </div>
              </NuxtLink>
            </div>
          </div>

          <!-- Topic Information -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Topic Information</h2>
            <div class="space-y-3">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Created</p>
                <p class="text-sm text-gray-900 dark:text-white">{{ formatDate(topic?.created_at) }}</p>
              </div>
              <div v-if="topic?.updated_at !== topic?.created_at">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</p>
                <p class="text-sm text-gray-900 dark:text-white">{{ formatDate(topic?.updated_at) }}</p>
              </div>
              <div v-if="topicStats?.total_size_bytes">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Size</p>
                <p class="text-sm text-gray-900 dark:text-white">{{ formatFileSize(topicStats.total_size_bytes) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Topic Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Edit Topic</h3>
          <button
            @click="showEditModal = false"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <Icon name="ic:baseline-close" class="w-5 h-5" />
          </button>
        </div>
        
        <form @submit.prevent="updateTopic" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
            <input
              v-model="editForm.title"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              v-model="editForm.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showEditModal = false"
              class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="updating"
              class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {{ updating ? 'Updating...' : 'Update Topic' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic, TopicStats } from '../../../../types/database'

// Page metadata
definePageMeta({
  title: 'Topic Detail'
})

const route = useRoute()
const topicId = route.params['id'] as string

// Reactive state
const topic = ref<Topic | null>(null)
const topicStats = ref<TopicStats | null>(null)
const showEditModal = ref(false)
const updating = ref(false)
const chatSessionCount = ref(0)

// Edit form
const editForm = reactive({
  title: '',
  description: ''
})

// Fetch topic data
const { data: topicData, pending, error, refresh } = await useFetch<{
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
    
    // Update edit form
    editForm.title = newData.topic.title
    editForm.description = newData.topic.description || ''
  }
}, { immediate: true })

// Load additional data on mount
onMounted(() => {
  loadChatSessionCount()
})

// Utility functions
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}


const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}


// Data loading functions
const loadChatSessionCount = () => {
  try {
    const chatKey = `trickster_chat_${topicId}`
    const stored = localStorage.getItem(chatKey)
    if (stored) {
      const chatData = JSON.parse(stored)
      // Check for new multi-session structure
      if (chatData.conversations && Array.isArray(chatData.conversations)) {
        chatSessionCount.value = chatData.conversations.length
      } else if (chatData.messages) {
        // Legacy single session structure
        chatSessionCount.value = 1
      } else {
        chatSessionCount.value = 0
      }
    } else {
      chatSessionCount.value = 0
    }
  } catch (error) {
    console.error('Failed to load chat session count:', error)
    chatSessionCount.value = 0
  }
}


// Topic management
const updateTopic = async () => {
  if (!topic.value) return
  
  updating.value = true
  try {
    const response = await $fetch<{ topic: Topic }>(`/api/topics/${topicId}`, {
      method: 'PUT',
      body: {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null
      }
    })
    
    if (response?.topic) {
      topic.value = response.topic
      showEditModal.value = false
      
      
      // Refresh topic data
      await refresh()
    }
  } catch (error) {
    console.error('Failed to update topic:', error)
    // Could show error toast here
  } finally {
    updating.value = false
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
