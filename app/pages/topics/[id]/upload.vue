<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upload Documents</h1>
            <p v-if="topic" class="text-gray-600 dark:text-gray-300">
              Add documents to "<strong>{{ topic.title }}</strong>"
            </p>
            <p v-else class="text-gray-600 dark:text-gray-300">
              Add documents to your topic
            </p>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink 
              :to="`/topics/${route.params['id']}`"
              class="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
            >
              <Icon name="ic:baseline-arrow-back" class="w-4 h-4 mr-2" />
              Back to Topic
            </NuxtLink>
            <NuxtLink 
              to="/topics"
              class="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
            >
              All Topics
            </NuxtLink>
          </div>
        </div>

        <!-- Topic Info Card -->
        <div v-if="topic" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ topic.title }}</h3>
              <p v-if="topic.description" class="text-gray-600 dark:text-gray-300 mb-3">{{ topic.description }}</p>
              <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Created: {{ formatDate(topic.created_at) }}</span>
                <span v-if="topicStats">{{ topicStats.document_count || 0 }} documents</span>
                <span v-if="topicStats">{{ formatFileSize(topicStats.total_size_bytes || 0) }} total</span>
              </div>
            </div>
            <div class="flex gap-2">
              <NuxtLink 
                :to="`/topics/${route.params['id']}/chat`"
                class="inline-flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Quick Chat
              </NuxtLink>
              <NuxtLink 
                :to="`/topics/${route.params['id']}/what-if`"
                class="inline-flex items-center px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                What If
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Section -->
      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Main Upload Area -->
        <div class="lg:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upload New Documents</h2>
            
            <!-- File Upload Component -->
            <FileUpload
              :topic-id="route.params['id'] as string"
              :multiple="true"
              :max-file-size="10 * 1024 * 1024"
              :max-files="10"
              :supported-formats="['txt', 'md', 'markdown', 'html']"
              :auto-upload="false"
              @files-selected="handleFilesSelected"
              @upload-start="handleUploadStart"
              @upload-progress="handleUploadProgress"
              @upload-complete="handleUploadComplete"
              @upload-error="handleUploadError"
            />

            <!-- Upload Instructions -->
            <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 class="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Upload Guidelines</h3>
              <ul class="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Supported formats: .txt, .md, .markdown, .html</li>
                <li>• Maximum file size: 10MB per file</li>
                <li>• Up to 10 files can be uploaded at once</li>
                <li>• Files will be processed and indexed automatically</li>
                <li>• Duplicate filenames will be automatically renamed</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Upload Statistics -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Statistics</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Total Uploads</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ uploadStats.totalUploads }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Successful</span>
                <span class="font-medium text-green-600 dark:text-green-400">{{ uploadStats.successful }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Failed</span>
                <span class="font-medium text-red-600 dark:text-red-400">{{ uploadStats.failed }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">Total Size</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatFileSize(uploadStats.totalSize) }}</span>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div v-if="recentActivity.length > 0" class="space-y-3">
              <div
                v-for="activity in recentActivity"
                :key="activity.id"
                class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div class="w-2 h-2 rounded-full mt-2 flex-shrink-0" :class="{
                  'bg-green-500': activity.type === 'success',
                  'bg-red-500': activity.type === 'error',
                  'bg-blue-500': activity.type === 'info'
                }"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-900 dark:text-white">{{ activity.message }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ formatTime(activity.timestamp) }}</p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-gray-500 dark:text-gray-400 text-sm">No recent activity</p>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div class="space-y-3">
              <button
                @click="refreshDocuments"
                :disabled="refreshing"
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                <Icon name="ic:baseline-refresh" class="w-4 h-4" :class="{ 'animate-spin': refreshing }" />
                {{ refreshing ? 'Refreshing...' : 'Refresh Documents' }}
              </button>
              <NuxtLink
                :to="`/topics/${route.params['id']}`"
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <Icon name="ic:baseline-description" class="w-4 h-4" />
                View All Documents
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="showSuccessMessage" class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
        <div class="flex items-center gap-2">
          <Icon name="ic:baseline-check" class="w-5 h-5" />
          {{ successMessage }}
        </div>
      </div>

      <div v-if="showErrorMessage" class="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
        <div class="flex items-center gap-2">
          <Icon name="ic:baseline-close" class="w-5 h-5" />
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic, TopicStats } from '../../../../types/database'
import FileUpload from '~/components/FileManagement/FileUpload.vue'

// Page metadata
definePageMeta({
  title: 'Upload Documents'
})

const route = useRoute()
const topicId = route.params['id'] as string

// Reactive state
const topic = ref<Topic | null>(null)
const topicStats = ref<TopicStats | null>(null)
const refreshing = ref(false)

// Upload statistics
const uploadStats = reactive({
  totalUploads: 0,
  successful: 0,
  failed: 0,
  totalSize: 0
})

// Activity tracking
const recentActivity = ref<Array<{
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  timestamp: Date
}>>([])

// Message state
const showSuccessMessage = ref(false)
const showErrorMessage = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Fetch topic data
const { data: topicData, pending, error } = await useFetch<{
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
  }
}, { immediate: true })

// Utility functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString(undefined, {
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

const addActivity = (type: 'success' | 'error' | 'info', message: string) => {
  const activity = {
    id: Date.now().toString(),
    type,
    message,
    timestamp: new Date()
  }
  recentActivity.value.unshift(activity)
  
  // Keep only last 10 activities
  if (recentActivity.value.length > 10) {
    recentActivity.value = recentActivity.value.slice(0, 10)
  }
}

const showMessage = (message: string, isError = false) => {
  if (isError) {
    errorMessage.value = message
    showErrorMessage.value = true
    setTimeout(() => {
      showErrorMessage.value = false
    }, 5000)
  } else {
    successMessage.value = message
    showSuccessMessage.value = true
    setTimeout(() => {
      showSuccessMessage.value = false
    }, 3000)
  }
}

// Event handlers
const handleFilesSelected = (files: File[]) => {
  addActivity('info', `${files.length} files selected for upload`)
}

const handleUploadStart = (files: File[]) => {
  addActivity('info', `Starting upload of ${files.length} files`)
  uploadStats.totalUploads += files.length
}

const handleUploadProgress = (progress: any[]) => {
  // Progress updates are handled by the FileUpload component
  // We could add more detailed tracking here if needed
}

const handleUploadComplete = (result: any) => {
  const processedCount = result.processedCount || 0
  const totalCount = result.totalCount || 0
  const failedCount = totalCount - processedCount
  
  uploadStats.successful += processedCount
  uploadStats.failed += failedCount
  
  if (result.documents) {
    const totalSize = result.documents.reduce((sum: number, doc: any) => sum + (doc.sizeBytes || 0), 0)
    uploadStats.totalSize += totalSize
  }
  
  if (processedCount > 0) {
    addActivity('success', `Successfully uploaded ${processedCount} of ${totalCount} files`)
    showMessage(`Successfully uploaded ${processedCount} files`)
    
    // Refresh topic stats
    refreshDocuments()
  }
  
  if (failedCount > 0) {
    addActivity('error', `${failedCount} files failed to upload`)
    if (result.errors && result.errors.length > 0) {
      console.error('Upload errors:', result.errors)
    }
  }
}

const handleUploadError = (error: string) => {
  uploadStats.failed += 1
  addActivity('error', `Upload failed: ${error}`)
  showMessage(`Upload failed: ${error}`, true)
}

const refreshDocuments = async () => {
  refreshing.value = true
  try {
    // Refresh topic data to get updated stats
    // Refresh topic data
    const refreshedData = await $fetch<{ topic: Topic & { stats?: TopicStats } }>(`/api/topics/${topicId}`, {
      query: { stats: 'true' }
    })
    
    if (refreshedData?.topic) {
      topic.value = refreshedData.topic
      topicStats.value = refreshedData.topic.stats || null
    }
    
    addActivity('info', 'Document list refreshed')
  } catch (error) {
    console.error('Failed to refresh documents:', error)
    addActivity('error', 'Failed to refresh document list')
  } finally {
    refreshing.value = false
  }
}

// Handle navigation guard
onBeforeRouteLeave(() => {
  // Could add confirmation if upload is in progress
  return true
})

// Error handling for missing topic
if (error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Topic not found'
  })
}
</script>

<style scoped>
/* Custom animations for messages */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.fixed.bottom-4.right-4 {
  animation: slideInRight 0.3s ease-out;
}
</style>
