<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Topics Management</h1>
            <p class="text-gray-600 dark:text-gray-300">Create and manage your creative topics</p>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink 
              to="/" 
              class="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
            >
              <Icon name="ic:baseline-arrow-back" class="w-4 h-4 mr-2" />
              Dashboard
            </NuxtLink>
            <button 
              @click="showCreateModal = true"
              class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Icon name="ic:baseline-add" class="w-4 h-4 mr-2" />
              Create New Topic
            </button>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="flex flex-col sm:flex-row gap-4 mb-6">
          <div class="flex-1">
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search topics..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Icon name="ic:baseline-search" class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select
              v-model="sortBy"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="updated_at">Recently Updated</option>
              <option value="created_at">Recently Created</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Topics List -->
      <TopicList
        :topics="filteredTopics"
        :topic-stats="topicStats"
        :loading="pending"
        :loading-more="loadingMore"
        :loading-topics="loadingTopics"
        :show-stats="true"
        :has-more="hasMore"
:error="error?.message || ''"
        @refresh="refresh"
        @create="showCreateModal = true"
        @edit="handleEditTopic"
        @delete="handleDeleteTopic"
        @chat="handleQuickChat"
        @whatif="handleWhatIf"
        @load-more="loadMore"
      />
    </div>

    <!-- Create Topic Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="w-full max-w-md">
        <TopicForm
          :loading="createLoading"
          @submit="handleCreateTopic"
          @cancel="showCreateModal = false"
          @close="showCreateModal = false"
        />
      </div>
    </div>

    <!-- Edit Topic Modal -->
    <div v-if="showEditModal && editingTopic" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="w-full max-w-md">
        <TopicForm
          :topic="editingTopic"
          :loading="updateLoading"
          @submit="handleUpdateTopic"
          @cancel="closeEditModal"
          @close="closeEditModal"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal && deletingTopic" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
        <div class="flex items-center mb-4">
          <div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
            <Icon name="ic:baseline-warning" class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Topic</h3>
        </div>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to delete "<strong>{{ deletingTopic.title }}</strong>"? This action cannot be undone and will also delete all associated documents and generated content.
        </p>
        <div class="flex justify-end gap-3">
          <button
            @click="closeDeleteModal"
            :disabled="deleteLoading"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="deleteLoading"
            class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            <div v-if="deleteLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {{ deleteLoading ? 'Deleting...' : 'Delete Topic' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic, TopicStats, TopicInsert, TopicUpdate } from '../../../types/database'

// Page metadata
definePageMeta({
  title: 'Topics Management'
})

// Reactive state
const searchQuery = ref('')
const sortBy = ref('updated_at')
const currentPage = ref(1)
const pageSize = ref(20)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

// Loading states
const createLoading = ref(false)
const updateLoading = ref(false)
const deleteLoading = ref(false)
const loadingMore = ref(false)
const loadingTopics = ref(new Set<string>())

// Edit/Delete state
const editingTopic = ref<Topic | null>(null)
const deletingTopic = ref<Topic | null>(null)

// Fetch topics with statistics
const { data, pending, error, refresh } = await useFetch<{ 
  topics: (Topic & { stats?: TopicStats })[], 
  total: number 
}>('/api/topics', {
  query: computed(() => ({
    stats: 'true',
    page: currentPage.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
    sort: sortBy.value
  })),
  server: false,
  watch: [currentPage, pageSize, searchQuery, sortBy]
})

// Computed properties
const topics = computed(() => data.value?.topics || [])
const topicStats = computed(() => {
  const stats: Record<string, TopicStats> = {}
  topics.value.forEach(topic => {
    if (topic.stats) {
      stats[topic.id] = topic.stats
    }
  })
  return stats
})

const filteredTopics = computed(() => {
  let filtered = [...topics.value]
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(topic => 
      topic.title.toLowerCase().includes(query) ||
      (topic.description && topic.description.toLowerCase().includes(query))
    )
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'updated_at':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })
  
  return filtered
})

const hasMore = computed(() => {
  const total = data.value?.total || 0
  return topics.value.length < total
})

// Check for edit query parameter on mount
onMounted(() => {
  const route = useRoute()
  if (route.query['edit']) {
    const topicId = route.query['edit'] as string
    const topic = topics.value.find(t => t.id === topicId)
    if (topic) {
      handleEditTopic(topic)
    }
  }
})

// Event handlers
const handleCreateTopic = async (data: TopicInsert | TopicUpdate) => {
  // Ensure this is a create operation (no id)
  if ('id' in data && data.id) {
    console.error('Unexpected id in create operation')
    return
  }
  
  createLoading.value = true
  try {
    const createData: TopicInsert = {
      title: data.title!,
      description: data.description ?? null
    }
    
    const response = await $fetch<{ topic: Topic }>('/api/topics', {
      method: 'POST',
      body: createData
    })
    
    // Refresh the topics list
    await refresh()
    
    // Close modal
    showCreateModal.value = false
    
    // Show success message (could be replaced with toast notification)
    console.log('Topic created successfully:', response.topic.title)
    
  } catch (error) {
    console.error('Failed to create topic:', error)
    alert('Failed to create topic. Please try again.')
  } finally {
    createLoading.value = false
  }
}

const handleEditTopic = (topic: Topic) => {
  editingTopic.value = topic
  showEditModal.value = true
  
  // Update URL to reflect edit state
  const router = useRouter()
  router.replace({ query: { edit: topic.id } })
}

const handleUpdateTopic = async (data: TopicInsert | TopicUpdate) => {
  if (!editingTopic.value) return
  
  updateLoading.value = true
  try {
    const updateData: TopicUpdate = {
      id: editingTopic.value.id,
      title: data.title || editingTopic.value.title,
      description: data.description ?? null,
      updated_at: new Date().toISOString()
    }
    
    const response = await $fetch<{ topic: Topic }>(`/api/topics/${editingTopic.value.id}`, {
      method: 'PUT',
      body: updateData
    })
    
    // Refresh the topics list
    await refresh()
    
    // Close modal
    closeEditModal()
    
    // Show success message
    console.log('Topic updated successfully:', response.topic.title)
    
  } catch (error) {
    console.error('Failed to update topic:', error)
    alert('Failed to update topic. Please try again.')
  } finally {
    updateLoading.value = false
  }
}

const closeEditModal = () => {
  showEditModal.value = false
  editingTopic.value = null
  
  // Clear edit query parameter
  const router = useRouter()
  router.replace({ query: {} })
}

const handleDeleteTopic = (topic: Topic) => {
  deletingTopic.value = topic
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!deletingTopic.value) return
  
  deleteLoading.value = true
  try {
    await $fetch(`/api/topics/${deletingTopic.value.id}`, {
      method: 'DELETE'
    })
    
    // Refresh the topics list
    await refresh()
    
    // Close modal
    closeDeleteModal()
    
    // Show success message
    console.log('Topic deleted successfully')
    
  } catch (error) {
    console.error('Failed to delete topic:', error)
    alert('Failed to delete topic. Please try again.')
  } finally {
    deleteLoading.value = false
  }
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingTopic.value = null
}

const handleQuickChat = (topic: Topic) => {
  navigateTo(`/topics/${topic.id}/chat`)
}

const handleWhatIf = (topic: Topic) => {
  navigateTo(`/topics/${topic.id}/what-if`)
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  try {
    currentPage.value += 1
    // The watcher will automatically trigger a new fetch
  } catch (error) {
    console.error('Failed to load more topics:', error)
    currentPage.value -= 1 // Revert on error
  } finally {
    loadingMore.value = false
  }
}

// Handle keyboard shortcuts
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    // Ctrl/Cmd + N to create new topic
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault()
      showCreateModal.value = true
    }
    
    // Escape to close modals
    if (event.key === 'Escape') {
      if (showCreateModal.value) {
        showCreateModal.value = false
      } else if (showEditModal.value) {
        closeEditModal()
      } else if (showDeleteModal.value) {
        closeDeleteModal()
      }
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})
</script>
