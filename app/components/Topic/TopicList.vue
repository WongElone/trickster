<template>
  <div class="topic-list">
    <!-- Header -->
    <div class="topic-list__header">
      <div class="topic-list__title-section">
        <h2 class="topic-list__title">{{ $t('topics.title') }}</h2>
        <p v-if="!loading && topics.length > 0" class="topic-list__count">
          {{ $t('topics.count', { count: topics.length }) }}
        </p>
      </div>
      <div class="topic-list__actions">
        <button
          class="topic-list__refresh-btn"
          :title="$t('topics.refresh')"
          @click="$emit('refresh')"
          :disabled="loading"
        >
          <Icon name="ic:baseline-refresh" class="icon" :class="{ 'animate-spin': loading }" />
        </button>
        <button
          class="topic-list__create-btn"
          @click="$emit('create')"
          :disabled="loading"
        >
          <Icon name="ic:baseline-add" class="icon" />
          {{ $t('topics.create') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && topics.length === 0" class="topic-list__loading">
      <div class="topic-list__loading-content">
        <div class="spinner-large"></div>
        <p class="topic-list__loading-text">{{ $t('topics.loading') }}</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && topics.length === 0" class="topic-list__empty">
      <div class="topic-list__empty-content">
        <Icon name="ic:baseline-description" class="topic-list__empty-icon" />
        <h3 class="topic-list__empty-title">{{ $t('topics.empty.title') }}</h3>
        <p class="topic-list__empty-description">{{ $t('topics.empty.description') }}</p>
        <button
          class="topic-list__empty-action"
          @click="$emit('create')"
        >
          {{ $t('topics.empty.action') }}
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="topic-list__error">
      <div class="topic-list__error-content">
        <Icon name="ic:baseline-error" class="topic-list__error-icon" />
        <h3 class="topic-list__error-title">{{ $t('topics.error.title') }}</h3>
        <p class="topic-list__error-description">{{ error }}</p>
        <button
          class="topic-list__error-action"
          @click="$emit('refresh')"
        >
          {{ $t('topics.error.retry') }}
        </button>
      </div>
    </div>

    <!-- Topics Grid -->
    <div v-else class="topic-list__grid">
      <TopicCard
        v-for="topic in topics"
        :key="topic.id"
        :topic="topic"
        v-bind="topicStats[topic.id] ? { stats: topicStats[topic.id] } : {}"
        :show-stats="showStats"
        :loading="loadingTopics.has(topic.id)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @chat="$emit('chat', $event)"
        @whatif="$emit('whatif', $event)"
      />
    </div>

    <!-- Load More -->
    <div v-if="hasMore && !loading" class="topic-list__load-more">
      <button
        class="topic-list__load-more-btn"
        @click="$emit('load-more')"
        :disabled="loadingMore"
      >
        <div v-if="loadingMore" class="spinner"></div>
        {{ loadingMore ? $t('topics.loadingMore') : $t('topics.loadMore') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic, TopicStats } from '../../../types/database'
interface Props {
  topics: Topic[]
  topicStats?: Record<string, TopicStats>
  loading?: boolean
  loadingMore?: boolean
  loadingTopics?: Set<string>
  showStats?: boolean
  hasMore?: boolean
  error?: string
}

interface Emits {
  refresh: []
  create: []
  edit: [topic: Topic]
  delete: [topic: Topic]
  chat: [topic: Topic]
  whatif: [topic: Topic]
  'load-more': []
}

const props = withDefaults(defineProps<Props>(), {
  topicStats: () => ({}),
  loading: false,
  loadingMore: false,
  loadingTopics: () => new Set(),
  showStats: true,
  hasMore: false,
  error: ''
})

defineEmits<Emits>()

// Placeholder for i18n - will be implemented in Phase 9
const $t = (key: string, params?: Record<string, any>): string => {
  const translations: Record<string, string> = {
    'topics.title': 'Topics',
    'topics.count': `${params?.['count'] || 0} topics`,
    'topics.refresh': 'Refresh Topics',
    'topics.create': 'Create Topic',
    'topics.loading': 'Loading topics...',
    'topics.loadingMore': 'Loading more...',
    'topics.loadMore': 'Load More',
    'topics.empty.title': 'No Topics Yet',
    'topics.empty.description': 'Create your first topic to start organizing your content and generating creative scenarios.',
    'topics.empty.action': 'Create Your First Topic',
    'topics.error.title': 'Failed to Load Topics',
    'topics.error.retry': 'Try Again'
  }
  return translations[key] || key
}
</script>

<style scoped>
@reference "~/assets/css/main.css";
.topic-list {
  @apply w-full;
}

.topic-list__header {
  @apply flex items-center justify-between mb-6;
}

.topic-list__title-section {
  @apply flex flex-col;
}

.topic-list__title {
  @apply text-2xl font-bold text-gray-900 dark:text-white;
}

.topic-list__count {
  @apply text-sm text-gray-500 dark:text-gray-400 mt-1;
}

.topic-list__actions {
  @apply flex items-center gap-3;
}

.topic-list__refresh-btn {
  @apply p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.topic-list__create-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.topic-list__loading {
  @apply flex justify-center items-center py-16;
}

.topic-list__loading-content {
  @apply flex flex-col items-center gap-4;
}

.topic-list__loading-text {
  @apply text-gray-600 dark:text-gray-400;
}

.topic-list__empty {
  @apply flex justify-center items-center py-16;
}

.topic-list__empty-content {
  @apply flex flex-col items-center text-center max-w-md;
}

.topic-list__empty-icon {
  @apply w-16 h-16 text-gray-400 dark:text-gray-500 mb-4;
}

.topic-list__empty-title {
  @apply text-xl font-semibold text-gray-900 dark:text-white mb-2;
}

.topic-list__empty-description {
  @apply text-gray-600 dark:text-gray-400 mb-6;
}

.topic-list__empty-action {
  @apply px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium transition-colors duration-150;
}

.topic-list__error {
  @apply flex justify-center items-center py-16;
}

.topic-list__error-content {
  @apply flex flex-col items-center text-center max-w-md;
}

.topic-list__error-icon {
  @apply w-16 h-16 text-red-400 dark:text-red-500 mb-4;
}

.topic-list__error-title {
  @apply text-xl font-semibold text-gray-900 dark:text-white mb-2;
}

.topic-list__error-description {
  @apply text-gray-600 dark:text-gray-400 mb-6;
}

.topic-list__error-action {
  @apply px-6 py-3 bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md font-medium transition-colors duration-150;
}

.topic-list__grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6;
}

.topic-list__load-more {
  @apply flex justify-center mt-8;
}

.topic-list__load-more-btn {
  @apply flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.icon {
  @apply w-4 h-4;
}

.spinner {
  @apply w-4 h-4 border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-300 rounded-full animate-spin;
}

.spinner-large {
  @apply w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .topic-list__header {
    @apply flex-col items-start gap-4;
  }
  
  .topic-list__actions {
    @apply w-full justify-between;
  }
  
  .topic-list__grid {
    @apply grid-cols-1;
  }
}
</style>
