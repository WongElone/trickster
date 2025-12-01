<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header Section -->
    <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="container mx-auto px-4 py-8">
        <div class="text-center">
          <h1 class="text-4xl font-bold mb-4 text-gray-900 dark:text-white">🎭 Trickster</h1>
          <p class="text-xl text-gray-600 dark:text-gray-300 mb-6">
            AI-Powered Imagination Generator
          </p>
          <p class="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Create topics, upload content, and explore creative "What if" scenarios with AI
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
      <!-- Quick Actions -->
      <div class="mb-12">
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink 
            to="/topics" 
            class="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
          >
            <Icon name="ic:baseline-add" class="w-5 h-5 mr-2" />
            Create New Topic
          </NuxtLink>
          <NuxtLink 
            to="/topics" 
            class="inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200 shadow-sm"
          >
            <Icon name="ic:baseline-folder" class="w-5 h-5 mr-2" />
            Manage All Topics
          </NuxtLink>
        </div>
      </div>

      <!-- Recent Topics Overview -->
      <div class="mb-12">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Recent Topics</h2>
          <NuxtLink 
            to="/topics" 
            class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
          >
            View All →
          </NuxtLink>
        </div>

        <!-- Loading State -->
        <div v-if="pending" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4"></div>
              <div class="flex gap-2">
                <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-12">
          <div class="text-red-500 dark:text-red-400 mb-4">
            <Icon name="ic:baseline-error" class="w-12 h-12 mx-auto mb-4" />
            <p class="text-lg font-medium">Failed to load topics</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{{ error.message }}</p>
          </div>
          <button 
            @click="refresh()" 
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>

        <!-- Topics Grid -->
        <div v-else-if="data?.topics && data.topics.length > 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TopicCard
            v-for="topicWithStats in recentTopics"
            :key="topicWithStats.id"
            :topic="{
              id: topicWithStats.id,
              title: topicWithStats.title,
              description: topicWithStats.description,
              created_at: topicWithStats.created_at,
              updated_at: topicWithStats.updated_at
            }"
            v-bind="topicWithStats.stats ? { stats: topicWithStats.stats } : {}"
            :show-stats="true"
            :loading="false"
            @edit="(topic) => handleEditTopic(topicWithStats)"
            @delete="(topic) => handleDeleteTopic(topicWithStats)"
            @chat="(topic) => handleQuickChat(topicWithStats)"
            @whatif="(topic) => handleWhatIf(topicWithStats)"
          />
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <div class="text-gray-400 dark:text-gray-500 mb-6">
            <Icon name="ic:baseline-folder" class="w-16 h-16 mx-auto mb-4" />
            <h3 class="text-xl font-medium text-gray-900 dark:text-white mb-2">No Topics Yet</h3>
            <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Get started by creating your first topic to begin your creative journey with AI-powered imagination generation.
            </p>
          </div>
          <NuxtLink 
            to="/topics" 
            class="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
          >
            <Icon name="ic:baseline-add" class="w-5 h-5 mr-2" />
            Create Your First Topic
          </NuxtLink>
        </div>
      </div>

      <!-- Features Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h3 class="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Platform Features</h3>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="ic:baseline-chat" class="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Quick Chat</h4>
            <p class="text-gray-600 dark:text-gray-300">RAG-based conversations with your uploaded content for interactive exploration</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="ic:baseline-lightbulb" class="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">What-If Scenarios</h4>
            <p class="text-gray-600 dark:text-gray-300">Generate creative scenarios and explore unlimited possibilities with AI</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="ic:baseline-psychology" class="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h4 class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Bilingual Support</h4>
            <p class="text-gray-600 dark:text-gray-300">Full Chinese and English language support for global accessibility</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic, TopicStats } from '../../types/database'
// Fetch topics with statistics
const { data, pending, error, refresh } = await useFetch<{ topics: (Topic & { stats?: TopicStats })[] }>('/api/topics', {
  query: { stats: 'true' },
  server: false // Client-side only for now since this is a dashboard
})

// Computed property to show only recent topics (max 6)
const recentTopics = computed(() => {
  if (!data.value?.topics) return []
  return data.value.topics.slice(0, 6)
})

// Event handlers for topic actions
const handleEditTopic = (topic: Topic) => {
  // Navigate to topic management page with edit mode
  navigateTo(`/topics?edit=${topic.id}`)
}

const handleDeleteTopic = async (topic: Topic) => {
  // Show confirmation dialog and handle deletion
  const confirmed = confirm(`Are you sure you want to delete "${topic.title}"? This action cannot be undone.`)
  if (confirmed) {
    try {
      await $fetch(`/api/topics/${topic.id}`, { method: 'DELETE' })
      // Refresh the topics list
      await refresh()
    } catch (error) {
      console.error('Failed to delete topic:', error)
      alert('Failed to delete topic. Please try again.')
    }
  }
}

const handleQuickChat = (topic: Topic) => {
  // Navigate to Quick Chat mode for this topic
  navigateTo(`/topics/${topic.id}/chat`)
}

const handleWhatIf = (topic: Topic) => {
  // Navigate to What-If mode for this topic
  navigateTo(`/topics/${topic.id}/what-if`)
}
</script>
