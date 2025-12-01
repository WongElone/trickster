<template>
  <div class="file-list">
    <!-- Header -->
    <div class="file-list__header">
      <div class="file-list__title-section">
        <h3 class="file-list__title">{{ $t('fileList.title') }}</h3>
        <p v-if="!loading && documents.length > 0" class="file-list__count">
          {{ $t('fileList.count', { count: documents.length }) }}
        </p>
      </div>
      <div class="file-list__actions">
        <button
          class="file-list__refresh-btn"
          :title="$t('fileList.refresh')"
          @click="$emit('refresh')"
          :disabled="loading"
        >
          <Icon name="ic:baseline-refresh" class="icon" :class="{ 'animate-spin': loading }" />
        </button>
        <button
          v-if="showUploadButton"
          class="file-list__upload-btn"
          @click="$emit('upload')"
          :disabled="loading"
        >
          <Icon name="ic:baseline-cloud-upload" class="icon" />
          {{ $t('fileList.upload') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && documents.length === 0" class="file-list__loading">
      <div class="file-list__loading-content">
        <div class="spinner-large"></div>
        <p class="file-list__loading-text">{{ $t('fileList.loading') }}</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && documents.length === 0" class="file-list__empty">
      <div class="file-list__empty-content">
        <Icon name="ic:baseline-description" class="file-list__empty-icon" />
        <h4 class="file-list__empty-title">{{ $t('fileList.empty.title') }}</h4>
        <p class="file-list__empty-description">{{ $t('fileList.empty.description') }}</p>
        <button
          v-if="showUploadButton"
          class="file-list__empty-action"
          @click="$emit('upload')"
        >
          {{ $t('fileList.empty.action') }}
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="file-list__error">
      <div class="file-list__error-content">
        <Icon name="ic:baseline-error" class="file-list__error-icon" />
        <h4 class="file-list__error-title">{{ $t('fileList.error.title') }}</h4>
        <p class="file-list__error-description">{{ error }}</p>
        <button
          class="file-list__error-action"
          @click="$emit('refresh')"
        >
          {{ $t('fileList.error.retry') }}
        </button>
      </div>
    </div>

    <!-- Files List -->
    <div v-else class="file-list__content">
      <!-- Filters and Sort -->
      <div v-if="showFilters" class="file-list__filters">
        <div class="file-list__filter-group">
          <label class="file-list__filter-label">{{ $t('fileList.filterByFormat') }}</label>
          <select
            v-model="selectedFormat"
            class="file-list__filter-select"
            @change="$emit('filter-change', { format: selectedFormat, sortBy: selectedSort })"
          >
            <option value="">{{ $t('fileList.allFormats') }}</option>
            <option v-for="format in availableFormats" :key="format" :value="format">
              .{{ format }}
            </option>
          </select>
        </div>
        <div class="file-list__filter-group">
          <label class="file-list__filter-label">{{ $t('fileList.sortBy') }}</label>
          <select
            v-model="selectedSort"
            class="file-list__filter-select"
            @change="$emit('filter-change', { format: selectedFormat, sortBy: selectedSort })"
          >
            <option value="uploaded_at_desc">{{ $t('fileList.sortOptions.newest') }}</option>
            <option value="uploaded_at_asc">{{ $t('fileList.sortOptions.oldest') }}</option>
            <option value="filename_asc">{{ $t('fileList.sortOptions.nameAZ') }}</option>
            <option value="filename_desc">{{ $t('fileList.sortOptions.nameZA') }}</option>
            <option value="size_desc">{{ $t('fileList.sortOptions.largest') }}</option>
            <option value="size_asc">{{ $t('fileList.sortOptions.smallest') }}</option>
          </select>
        </div>
      </div>

      <!-- Files Grid/List -->
      <div class="file-list__items" :class="{ 'file-list__items--grid': viewMode === 'grid' }">
        <div
          v-for="document in documents"
          :key="document.id"
          class="file-list__item"
          :class="{
            'file-list__item--loading': loadingDocuments.has(document.id),
            'file-list__item--grid': viewMode === 'grid'
          }"
        >
          <!-- File Icon -->
          <div class="file-list__item-icon">
            <FileTypeHandler :format="document.format" :size="'large'" />
          </div>

          <!-- File Info -->
          <div class="file-list__item-info">
            <h4 class="file-list__item-name" :title="document.original_filename">
              {{ document.original_filename }}
            </h4>
            <div class="file-list__item-meta">
              <span class="file-list__item-format">.{{ document.format }}</span>
              <span class="file-list__item-size">{{ formatFileSize(document.size_bytes) }}</span>
              <span class="file-list__item-date">{{ formatDate(document.uploaded_at) }}</span>
            </div>
            <div v-if="document.processed_at" class="file-list__item-status">
              <Icon name="ic:baseline-check" class="file-list__status-icon file-list__status-icon--processed" />
              <span class="file-list__status-text">{{ $t('fileList.processed') }}</span>
            </div>
            <div v-else class="file-list__item-status">
              <Icon name="ic:baseline-access-time" class="file-list__status-icon file-list__status-icon--pending" />
              <span class="file-list__status-text">{{ $t('fileList.pending') }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="file-list__item-actions">
            <button
              class="file-list__action-btn"
              :title="$t('fileList.view')"
              @click="$emit('view', document)"
              :disabled="loadingDocuments.has(document.id)"
            >
              <Icon name="ic:baseline-visibility" class="icon" />
            </button>
            <button
              class="file-list__action-btn"
              :title="$t('fileList.download')"
              @click="$emit('download', document)"
              :disabled="loadingDocuments.has(document.id)"
            >
              <Icon name="ic:baseline-download" class="icon" />
            </button>
            <button
              class="file-list__action-btn file-list__action-btn--danger"
              :title="$t('fileList.delete')"
              @click="$emit('delete', document)"
              :disabled="loadingDocuments.has(document.id)"
            >
              <Icon name="ic:baseline-delete" class="icon" />
            </button>
          </div>

          <!-- Loading Overlay -->
          <div v-if="loadingDocuments.has(document.id)" class="file-list__item-loading">
            <div class="spinner"></div>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore && !loading" class="file-list__load-more">
        <button
          class="file-list__load-more-btn"
          @click="$emit('load-more')"
          :disabled="loadingMore"
        >
          <div v-if="loadingMore" class="spinner"></div>
          {{ loadingMore ? $t('fileList.loadingMore') : $t('fileList.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Document } from '../../../types/database'

interface Props {
  documents: Document[]
  loading?: boolean
  loadingMore?: boolean
  loadingDocuments?: Set<string>
  hasMore?: boolean
  error?: string
  showUploadButton?: boolean
  showFilters?: boolean
  viewMode?: 'list' | 'grid'
}

interface Emits {
  refresh: []
  upload: []
  view: [document: Document]
  download: [document: Document]
  delete: [document: Document]
  'filter-change': [filters: { format: string; sortBy: string }]
  'load-more': []
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingMore: false,
  loadingDocuments: () => new Set(),
  hasMore: false,
  error: '',
  showUploadButton: true,
  showFilters: true,
  viewMode: 'list'
})

defineEmits<Emits>()

// Local state for filters
const selectedFormat = ref('')
const selectedSort = ref('uploaded_at_desc')

// Computed
const availableFormats = computed(() => {
  const formats = new Set(props.documents.map(doc => doc.format))
  return Array.from(formats).sort()
})

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

// Placeholder for i18n - will be implemented in Phase 9
const $t = (key: string, params?: Record<string, any>): string => {
  const translations: Record<string, string> = {
    'fileList.title': 'Documents',
    'fileList.count': `${params?.['count'] || 0} documents`,
    'fileList.refresh': 'Refresh Documents',
    'fileList.upload': 'Upload Files',
    'fileList.loading': 'Loading documents...',
    'fileList.loadingMore': 'Loading more...',
    'fileList.loadMore': 'Load More',
    'fileList.empty.title': 'No Documents',
    'fileList.empty.description': 'Upload your first document to get started with AI-powered content analysis.',
    'fileList.empty.action': 'Upload Documents',
    'fileList.error.title': 'Failed to Load Documents',
    'fileList.error.retry': 'Try Again',
    'fileList.filterByFormat': 'Format',
    'fileList.allFormats': 'All Formats',
    'fileList.sortBy': 'Sort By',
    'fileList.sortOptions.newest': 'Newest First',
    'fileList.sortOptions.oldest': 'Oldest First',
    'fileList.sortOptions.nameAZ': 'Name A-Z',
    'fileList.sortOptions.nameZA': 'Name Z-A',
    'fileList.sortOptions.largest': 'Largest First',
    'fileList.sortOptions.smallest': 'Smallest First',
    'fileList.processed': 'Processed',
    'fileList.pending': 'Processing',
    'fileList.view': 'View Document',
    'fileList.download': 'Download',
    'fileList.delete': 'Delete Document'
  }
  return translations[key] || key
}
</script>

<style scoped>
.file-list {
  @apply w-full;
}

.file-list__header {
  @apply flex items-center justify-between mb-6;
}

.file-list__title-section {
  @apply flex flex-col;
}

.file-list__title {
  @apply text-xl font-semibold text-gray-900 dark:text-white;
}

.file-list__count {
  @apply text-sm text-gray-500 dark:text-gray-400 mt-1;
}

.file-list__actions {
  @apply flex items-center gap-3;
}

.file-list__refresh-btn {
  @apply p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.file-list__upload-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.file-list__loading {
  @apply flex justify-center items-center py-16;
}

.file-list__loading-content {
  @apply flex flex-col items-center gap-4;
}

.file-list__loading-text {
  @apply text-gray-600 dark:text-gray-400;
}

.file-list__empty {
  @apply flex justify-center items-center py-16;
}

.file-list__empty-content {
  @apply flex flex-col items-center text-center max-w-md;
}

.file-list__empty-icon {
  @apply w-16 h-16 text-gray-400 dark:text-gray-500 mb-4;
}

.file-list__empty-title {
  @apply text-lg font-semibold text-gray-900 dark:text-white mb-2;
}

.file-list__empty-description {
  @apply text-gray-600 dark:text-gray-400 mb-6;
}

.file-list__empty-action {
  @apply px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium transition-colors duration-150;
}

.file-list__error {
  @apply flex justify-center items-center py-16;
}

.file-list__error-content {
  @apply flex flex-col items-center text-center max-w-md;
}

.file-list__error-icon {
  @apply w-16 h-16 text-red-400 dark:text-red-500 mb-4;
}

.file-list__error-title {
  @apply text-lg font-semibold text-gray-900 dark:text-white mb-2;
}

.file-list__error-description {
  @apply text-gray-600 dark:text-gray-400 mb-6;
}

.file-list__error-action {
  @apply px-6 py-3 bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md font-medium transition-colors duration-150;
}

.file-list__content {
  @apply space-y-6;
}

.file-list__filters {
  @apply flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg;
}

.file-list__filter-group {
  @apply flex flex-col gap-1;
}

.file-list__filter-label {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.file-list__filter-select {
  @apply px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.file-list__items {
  @apply space-y-3;
}

.file-list__items--grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0;
}

.file-list__item {
  @apply relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow duration-200;
}

.file-list__item--grid {
  @apply flex-col items-start text-center;
}

.file-list__item--loading {
  @apply pointer-events-none opacity-75;
}

.file-list__item-icon {
  @apply flex-shrink-0;
}

.file-list__item-info {
  @apply flex-1 min-w-0;
}

.file-list__item--grid .file-list__item-info {
  @apply w-full text-center;
}

.file-list__item-name {
  @apply text-sm font-medium text-gray-900 dark:text-white truncate mb-1;
}

.file-list__item-meta {
  @apply flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2;
}

.file-list__item--grid .file-list__item-meta {
  @apply justify-center;
}

.file-list__item-format {
  @apply px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full font-medium;
}

.file-list__item-status {
  @apply flex items-center gap-1 text-xs;
}

.file-list__item--grid .file-list__item-status {
  @apply justify-center;
}

.file-list__status-icon {
  @apply w-3 h-3;
}

.file-list__status-icon--processed {
  @apply text-green-500;
}

.file-list__status-icon--pending {
  @apply text-yellow-500;
}

.file-list__status-text {
  @apply text-gray-600 dark:text-gray-400;
}

.file-list__item-actions {
  @apply flex items-center gap-1;
}

.file-list__action-btn {
  @apply p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.file-list__action-btn--danger {
  @apply hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20;
}

.file-list__item-loading {
  @apply absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center rounded-lg;
}

.file-list__load-more {
  @apply flex justify-center mt-8;
}

.file-list__load-more-btn {
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
  .file-list__header {
    @apply flex-col items-start gap-4;
  }
  
  .file-list__actions {
    @apply w-full justify-between;
  }
  
  .file-list__filters {
    @apply flex-col;
  }
  
  .file-list__item {
    @apply flex-col items-start text-left;
  }
  
  .file-list__item-actions {
    @apply w-full justify-end;
  }
}
</style>
