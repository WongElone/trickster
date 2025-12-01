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
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Documents</h1>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ topic?.title || 'Loading...' }}</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button
              @click="refreshDocuments"
              :disabled="refreshing"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="ic:baseline-refresh" class="w-4 h-4 mr-2" :class="{ 'animate-spin': refreshing }" />
              Refresh
            </button>
            <NuxtLink
              :to="`/topics/${topicId}/upload`"
              class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              Upload More
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="pending && documents.length === 0" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading documents...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div class="flex items-center">
          <Icon name="ic:baseline-error" class="w-6 h-6 text-red-500 mr-3" />
          <div>
            <h3 class="text-lg font-medium text-red-800 dark:text-red-200">Error Loading Documents</h3>
            <p class="text-red-600 dark:text-red-300">{{ error.message || 'Failed to load documents' }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!documents || documents.length === 0" class="text-center py-12">
        <Icon name="ic:baseline-description" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Documents Found</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">This topic doesn't have any documents yet.</p>
        <NuxtLink
          :to="`/topics/${topicId}/upload`"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          <Icon name="ic:baseline-add" class="w-4 h-4 mr-2" />
          Upload Documents
        </NuxtLink>
      </div>

      <!-- Documents List -->
      <div v-else class="space-y-6">
        <!-- Summary Stats -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ pagination.totalCount }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">Total Documents</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ embeddedCount }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">Embedded</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ pendingCount }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-600 dark:text-gray-400">{{ formatFileSize(totalSize) }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">Total Size</div>
            </div>
          </div>
        </div>

        <!-- Documents Table -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">Document List</h3>
              <div class="flex flex-wrap items-center gap-4">
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ pageSummary }}</p>
                <div class="flex items-center gap-2">
                  <label for="page-size-select" class="text-sm text-gray-500 dark:text-gray-400">Rows per page</label>
                  <select
                    id="page-size-select"
                    v-model.number="pageSize"
                    :disabled="isFetchInProgress"
                    class="block w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-1.5 px-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option
                      v-for="option in pageSizeOptions"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      @click="handleSort('name')"
                      class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Document
                      <Icon :name="getSortIcon('name')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      @click="handleSort('size')"
                      class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Size
                      <Icon :name="getSortIcon('size')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      @click="handleSort('upload_time')"
                      class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    >
                      Upload Time
                      <Icon :name="getSortIcon('upload_time')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Embedding Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="document in documents"
                  :key="document.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <!-- Document Info -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Icon name="ic:baseline-description" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ document.original_filename }}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                          {{ document.format.toUpperCase() }} file
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Size -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ formatFileSize(document.size_bytes) }}
                  </td>

                  <!-- Upload Time -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ formatDate(document.uploaded_at) }}
                  </td>

                  <!-- Embedding Status -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getStatusBadgeClass(document.embedding_status)"
                    >
                      <span
                        class="w-1.5 h-1.5 mr-1.5 rounded-full"
                        :class="getStatusDotClass(document.embedding_status)"
                      ></span>
                      {{ getStatusText(document.embedding_status) }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex items-center gap-2">
                      <button
                        @click="confirmDelete(document)"
                        class="inline-flex items-center p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Delete document"
                      >
                        <Icon name="ic:baseline-delete" class="w-4 h-4" />
                      </button>
                      <button
                        @click="handleEmbeddingAction(document)"
                        :disabled="document.embedding_status === 'processing' || embeddingInProgress.has(document.id) || embeddingQueue.includes(document.id) || currentlyProcessing === document.id"
                        class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        :class="getActionButtonClass(document.embedding_status, embeddingQueue.includes(document.id))"
                      >
                        <Icon
                          v-if="document.embedding_status === 'processing' || embeddingInProgress.has(document.id) || currentlyProcessing === document.id"
                          name="ic:baseline-refresh"
                          class="w-3 h-3 mr-1.5 animate-spin"
                        />
                        <Icon
                          v-else-if="embeddingQueue.includes(document.id)"
                          name="ic:baseline-schedule"
                          class="w-3 h-3 mr-1.5"
                        />
                        <Icon
                          v-else-if="document.embedding_status === 'completed'"
                          name="ic:baseline-check"
                          class="w-3 h-3 mr-1.5"
                        />
                        <Icon
                          v-else
                          name="ic:baseline-add"
                          class="w-3 h-3 mr-1.5"
                        />
                        {{ getActionButtonText(document.embedding_status, embeddingInProgress.has(document.id), embeddingQueue.includes(document.id)) }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="showPagination"
            class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            <span class="text-sm text-gray-600 dark:text-gray-400">Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
            <div class="flex items-center gap-2">
              <button
                @click="goToPreviousPage"
                :disabled="!pagination.hasPrev || isFetchInProgress"
                class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="ic:baseline-chevron-left" class="w-4 h-4 mr-1" />
                Previous
              </button>
              <button
                @click="goToNextPage"
                :disabled="!pagination.hasNext || isFetchInProgress"
                class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <Icon name="ic:baseline-chevron-right" class="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="cancelDelete"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        @click.stop
      >
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Icon name="ic:baseline-warning" class="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div class="text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Delete Document
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete "<strong>{{ documentToDelete?.original_filename }}</strong>"? 
            This action cannot be undone and will also remove all associated embeddings.
          </p>
        </div>

        <div class="flex gap-3 justify-between">
          <button
            @click="cancelDelete"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="deleteDocument"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
          >
            Delete Document
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic, Document } from '../../../../types/database'

// Page metadata
definePageMeta({
  title: 'View Documents'
})

const route = useRoute()
const topicId = route.params['id'] as string

// Reactive state
const topic = ref<Topic | null>(null)
const documents = ref<Document[]>([])
const refreshing = ref(false)
const embeddingInProgress = ref(new Set<string>())
const embeddingQueue = ref<string[]>([])
const currentlyProcessing = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const documentToDelete = ref<Document | null>(null)

// Sorting & pagination state
const sortField = ref<'name' | 'size' | 'upload_time'>('upload_time')
const sortDirection = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const pageSize = ref(20)

const createDefaultStats = () => ({
  totalDocuments: 0,
  totalSize: 0,
  statusCounts: {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  }
})

const pagination = ref({
  page: 1,
  limit: pageSize.value,
  totalCount: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
  sortField: sortField.value,
  sortDirection: sortDirection.value
})

const stats = ref(createDefaultStats())

const pageSizeOptions = [10, 20, 50, 100] as const

// Fetch topic data
const { data: topicData, pending: topicPending, error: topicError } = await useFetch<{
  topic: Topic
}>(`/api/topics/${topicId}`, {
  server: false
})

// Fetch documents data
const requestUrl = computed(
  () => `/api/documents?topicId=${topicId}&page=${currentPage.value}&limit=${pageSize.value}&sortField=${sortField.value}&sortDirection=${sortDirection.value}`
)

const { data: documentsData, pending, error, refresh } = await useFetch<{
  documents: Document[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    sortField?: 'name' | 'size' | 'upload_time'
    sortDirection?: 'asc' | 'desc'
  }
  stats?: {
    totalDocuments: number
    totalSize: number
    statusCounts: {
      pending: number
      processing: number
      completed: number
      failed: number
    }
  }
  topic: {
    id: string
    title: string
  }
}>(() => requestUrl.value, {
  server: false
})

// Watch for data changes
watch(topicData, (newData) => {
  if (newData?.topic) {
    topic.value = newData.topic
  }
}, { immediate: true })

watch(documentsData, (newData) => {
  if (newData?.documents) {
    documents.value = newData.documents
  } else {
    documents.value = []
  }

  if (newData?.pagination) {
    const incoming = newData.pagination
    pagination.value = {
      page: incoming.page,
      limit: incoming.limit,
      totalCount: incoming.totalCount,
      totalPages: incoming.totalPages,
      hasNext: incoming.hasNext,
      hasPrev: incoming.hasPrev,
      sortField: (incoming.sortField as 'name' | 'size' | 'upload_time') || sortField.value,
      sortDirection: (incoming.sortDirection as 'asc' | 'desc') || sortDirection.value
    }

    if (currentPage.value !== incoming.page) {
      currentPage.value = incoming.page
    }

    if (pageSize.value !== incoming.limit) {
      pageSize.value = incoming.limit
    }

    if (incoming.sortField && sortField.value !== incoming.sortField) {
      sortField.value = incoming.sortField as 'name' | 'size' | 'upload_time'
    }

    if (incoming.sortDirection && sortDirection.value !== incoming.sortDirection) {
      sortDirection.value = incoming.sortDirection as 'asc' | 'desc'
    }
  }

  if (newData?.stats) {
    stats.value = {
      totalDocuments: newData.stats.totalDocuments || 0,
      totalSize: newData.stats.totalSize || 0,
      statusCounts: {
        pending: newData.stats.statusCounts?.pending || 0,
        processing: newData.stats.statusCounts?.processing || 0,
        completed: newData.stats.statusCounts?.completed || 0,
        failed: newData.stats.statusCounts?.failed || 0
      }
    }
  } else if (!newData) {
    stats.value = createDefaultStats()
  }
}, { immediate: true })

watch(pageSize, (newSize, oldSize) => {
  if (newSize !== oldSize) {
    currentPage.value = 1
  }
})

watch(currentPage, (newPage) => {
  const maxPage = Math.max(1, pagination.value.totalPages || 1)
  if (newPage < 1) {
    currentPage.value = 1
  } else if (newPage > maxPage) {
    currentPage.value = maxPage
  }
})

// Computed properties
const embeddedCount = computed(() => {
  return stats.value.statusCounts.completed || 0
})

const pendingCount = computed(() => {
  const counts = stats.value.statusCounts
  // Reason: Pending, processing, and failed documents are all awaiting embedding completion.
  return (counts.pending || 0) + (counts.processing || 0) + (counts.failed || 0)
})

const totalSize = computed(() => {
  return stats.value.totalSize || 0
})

const isFetchInProgress = computed(() => pending.value || refreshing.value)

const pageStart = computed(() => {
  if (pagination.value.totalCount === 0) {
    return 0
  }
  return (pagination.value.page - 1) * pagination.value.limit + 1
})

const pageEnd = computed(() => {
  if (pagination.value.totalCount === 0) {
    return 0
  }
  return Math.min(pagination.value.page * pagination.value.limit, pagination.value.totalCount)
})

const pageSummary = computed(() => {
  if (pagination.value.totalCount === 0) {
    return 'Showing 0 of 0'
  }
  return `Showing ${pageStart.value}-${pageEnd.value} of ${pagination.value.totalCount}`
})

const showPagination = computed(() => pagination.value.totalPages > 1 || pagination.value.totalCount > pagination.value.limit)

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
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getStatusText = (status: string): string => {
  const statusMap = {
    'pending': 'Pending',
    'processing': 'Processing',
    'completed': 'Embedded',
    'failed': 'Failed'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getStatusBadgeClass = (status: string): string => {
  const statusClasses = {
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'failed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }
  return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const getStatusDotClass = (status: string): string => {
  const dotClasses = {
    'pending': 'bg-yellow-400',
    'processing': 'bg-blue-400',
    'completed': 'bg-green-400',
    'failed': 'bg-red-400'
  }
  return dotClasses[status as keyof typeof dotClasses] || 'bg-gray-400'
}

const getActionButtonClass = (status: string, isQueued: boolean = false): string => {
  if (isQueued) {
    return 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30'
  }
  
  const buttonClasses = {
    'pending': 'text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50',
    'processing': 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
    'completed': 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
    'failed': 'text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50'
  }
  return buttonClasses[status as keyof typeof buttonClasses] || 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
}

const getActionButtonText = (status: string, inProgress: boolean, isQueued: boolean = false): string => {
  if (inProgress) return 'Embedding...'
  if (isQueued) return 'Queued'
  
  const buttonTexts = {
    'pending': 'Create Embeddings',
    'processing': 'Embedding...',
    'completed': 'Embedded',
    'failed': 'Retry Embeddings'
  }
  return buttonTexts[status as keyof typeof buttonTexts] || 'Create Embeddings'
}

// Sorting functions
const handleSort = (field: 'name' | 'size' | 'upload_time') => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = field === 'upload_time' ? 'desc' : 'asc'
  }
  currentPage.value = 1
}

const getSortIcon = (field: 'name' | 'size' | 'upload_time') => {
  if (sortField.value !== field) {
    return 'ic:baseline-unfold-more'
  }
  return sortDirection.value === 'asc' ? 'ic:baseline-keyboard-arrow-up' : 'ic:baseline-keyboard-arrow-down'
}

const goToPreviousPage = () => {
  if (!pagination.value.hasPrev || isFetchInProgress.value) {
    return
  }
  currentPage.value = Math.max(1, pagination.value.page - 1)
}

const goToNextPage = () => {
  if (!pagination.value.hasNext || isFetchInProgress.value) {
    return
  }
  currentPage.value = Math.min(pagination.value.totalPages, pagination.value.page + 1)
}

// Delete functions
const confirmDelete = (document: Document) => {
  documentToDelete.value = document
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  documentToDelete.value = null
  showDeleteConfirm.value = false
}

const deleteDocument = async () => {
  if (!documentToDelete.value) return

  try {
    await $fetch(`/api/documents/${documentToDelete.value.id}`, {
      method: 'DELETE'
    })
    
    // Refresh documents list
    await refreshDocuments()
    
    // Close dialog
    cancelDelete()
  } catch (error: any) {
    console.error('Failed to delete document:', error)
    alert('Failed to delete document: ' + (error.data?.message || error.message || 'Unknown error'))
  }
}

// Event handlers
const refreshDocuments = async () => {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

// Queue processing function
const processEmbeddingQueue = async () => {
  if (currentlyProcessing.value || embeddingQueue.value.length === 0) {
    return
  }

  const documentId = embeddingQueue.value.shift()
  if (!documentId) return

  currentlyProcessing.value = documentId
  embeddingInProgress.value.add(documentId)
  
  try {
    await $fetch(`/api/embeddings/create`, {
      method: 'POST',
      body: {
        documentId: documentId,
        topicId: topicId
      }
    })
    
    // Refresh documents to get updated status
    await refreshDocuments()
  } catch (error: any) {
    console.error('Failed to create embeddings:', error)
    // Show error message to user
    alert('Failed to create embeddings: ' + (error.data?.message || error.message || 'Unknown error'))
  } finally {
    embeddingInProgress.value.delete(documentId)
    currentlyProcessing.value = null
    
    // Process next item in queue
    if (embeddingQueue.value.length > 0) {
      // Use nextTick to avoid blocking the UI
      await nextTick()
      processEmbeddingQueue()
    }
  }
}

const handleEmbeddingAction = async (document: Document) => {
  if (document.embedding_status === 'completed' || 
      document.embedding_status === 'processing' ||
      embeddingQueue.value.includes(document.id) ||
      currentlyProcessing.value === document.id) {
    return
  }

  // Add to queue
  embeddingQueue.value.push(document.id)
  
  // Start processing if nothing is currently being processed
  processEmbeddingQueue()
}
</script>

<style scoped>
/* Tailwind CSS classes are available through the global configuration */
</style>
