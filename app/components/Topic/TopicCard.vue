<template>
  <div class="topic-card" :class="{ 'topic-card--loading': loading }">
    <!-- Card Header -->
    <div class="topic-card__header">
      <NuxtLink 
        :to="`/topics/${topic.id}`"
        class="topic-card__title-link"
        :title="topic.title"
      >
        <h3 class="topic-card__title">
          {{ topic.title }}
        </h3>
      </NuxtLink>
      <div class="topic-card__actions">
        <button
          class="topic-card__action-btn"
          :title="$t('topic.edit')"
          @click.stop="$emit('edit', topic)"
          :disabled="loading"
        >
          <Icon name="ic:baseline-edit" class="icon" />
        </button>
        <button
          class="topic-card__action-btn topic-card__action-btn--danger"
          :title="$t('topic.delete')"
          @click.stop="$emit('delete', topic)"
          :disabled="loading"
        >
          <Icon name="ic:baseline-delete" class="icon" />
        </button>
      </div>
    </div>

    <!-- Card Content -->
    <div class="topic-card__content">
      <p v-if="topic.description" class="topic-card__description">
        {{ topic.description }}
      </p>
      <p v-else class="topic-card__description topic-card__description--empty">
        {{ $t('topic.noDescription') }}
      </p>
    </div>

    <!-- Card Stats -->
    <div v-if="showStats && stats" class="topic-card__stats">
      <div class="topic-card__stat">
        <span class="topic-card__stat-label">{{ $t('topic.documents') }}</span>
        <span class="topic-card__stat-value">{{ stats.document_count || 0 }}</span>
      </div>
      <div class="topic-card__stat">
        <span class="topic-card__stat-label">{{ $t('topic.whatIfs') }}</span>
        <span class="topic-card__stat-value">{{ stats.what_if_count || 0 }}</span>
      </div>
      <div class="topic-card__stat">
        <span class="topic-card__stat-label">{{ $t('topic.size') }}</span>
        <span class="topic-card__stat-value">{{ formatFileSize(stats.total_size_bytes || 0) }}</span>
      </div>
    </div>

    <!-- Card Footer -->
    <div class="topic-card__footer">
      <div class="topic-card__dates">
        <span class="topic-card__date">
          {{ $t('topic.created') }}: {{ formatDate(topic.created_at) }}
        </span>
        <span v-if="topic.updated_at !== topic.created_at" class="topic-card__date">
          {{ $t('topic.updated') }}: {{ formatDate(topic.updated_at) }}
        </span>
      </div>
      <div class="topic-card__actions-primary">
        <button
          class="topic-card__btn topic-card__btn--secondary"
          @click="$emit('chat', topic)"
          :disabled="loading"
        >
          {{ $t('topic.quickChat') }}
        </button>
        <button
          class="topic-card__btn topic-card__btn--primary"
          @click="$emit('whatif', topic)"
          :disabled="loading"
        >
          {{ $t('topic.whatIf') }}
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="topic-card__loading">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic, TopicStats } from '../../../types/database'

interface Props {
  topic: Topic
  stats?: TopicStats
  showStats?: boolean
  loading?: boolean
}

interface Emits {
  edit: [topic: Topic]
  delete: [topic: Topic]
  chat: [topic: Topic]
  whatif: [topic: Topic]
}

const props = withDefaults(defineProps<Props>(), {
  showStats: true,
  loading: false
})

defineEmits<Emits>()

// Utility functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Placeholder for i18n - will be implemented in Phase 9
const $t = (key: string): string => {
  const translations: Record<string, string> = {
    'topic.edit': 'Edit Topic',
    'topic.delete': 'Delete Topic',
    'topic.noDescription': 'No description provided',
    'topic.documents': 'Documents',
    'topic.whatIfs': 'What-Ifs',
    'topic.size': 'Size',
    'topic.created': 'Created',
    'topic.updated': 'Updated',
    'topic.quickChat': 'Quick Chat',
    'topic.whatIf': 'What If'
  }
  return translations[key] || key
}
</script>

<style scoped>
@reference "~/assets/css/main.css";

.topic-card {
  @apply relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden;
}

.topic-card--loading {
  @apply pointer-events-none;
}

.topic-card__header {
  @apply flex items-start justify-between p-4 pb-2;
}

.topic-card__title-link {
  @apply flex-1 mr-2 no-underline;
}

.topic-card__title-link:hover .topic-card__title {
  @apply text-blue-600 dark:text-blue-400;
}

.topic-card__title {
  @apply text-lg font-semibold text-gray-900 dark:text-white truncate transition-colors duration-200;
}

.topic-card__actions {
  @apply flex gap-1;
}

.topic-card__action-btn {
  @apply p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.topic-card__action-btn--danger {
  @apply hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20;
}

.topic-card__content {
  @apply px-4 pb-2;
}

.topic-card__description {
  @apply text-sm text-gray-600 dark:text-gray-300 line-clamp-2;
}

.topic-card__description--empty {
  @apply italic text-gray-400 dark:text-gray-500;
}

.topic-card__stats {
  @apply flex justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600;
}

.topic-card__stat {
  @apply flex flex-col items-center text-center;
}

.topic-card__stat-label {
  @apply text-xs text-gray-500 dark:text-gray-400 mb-1;
}

.topic-card__stat-value {
  @apply text-sm font-medium text-gray-900 dark:text-white;
}

.topic-card__footer {
  @apply p-4 pt-2;
}

.topic-card__dates {
  @apply flex flex-col gap-1 mb-3;
}

.topic-card__date {
  @apply text-xs text-gray-500 dark:text-gray-400;
}

.topic-card__actions-primary {
  @apply flex gap-2;
}

.topic-card__btn {
  @apply flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.topic-card__btn--primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600;
}

.topic-card__btn--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600;
}

.topic-card__loading {
  @apply absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center;
}

.icon {
  @apply w-4 h-4;
}

.spinner {
  @apply w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin;
}

/* Utility classes for line clamping */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
