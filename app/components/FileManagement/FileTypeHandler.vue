<template>
  <div class="file-type-handler">
    <!-- File Icon -->
    <div 
      class="file-type-handler__icon"
      :class="[
        `file-type-handler__icon--${size}`,
        `file-type-handler__icon--${format}`,
        { 'file-type-handler__icon--clickable': clickable }
      ]"
      @click="handleClick"
    >
      <!-- Text File Icon -->
      <Icon v-if="format === 'txt'" name="ic:baseline-description" />
      <!-- Markdown File Icon -->
      <Icon v-else-if="format === 'md' || format === 'markdown'" name="ic:baseline-article" />
      <!-- HTML File Icon -->
      <Icon v-else-if="format === 'html'" name="ic:baseline-code" />
      <!-- Generic File Icon (fallback) -->
      <Icon v-else name="ic:baseline-insert-drive-file" />

      <!-- Format Badge -->
      <div v-if="showBadge" class="file-type-handler__badge">
        {{ formatBadgeText }}
      </div>
    </div>

    <!-- File Details (when expanded) -->
    <div v-if="showDetails" class="file-type-handler__details">
      <div class="file-type-handler__format-info">
        <h4 class="file-type-handler__format-name">{{ formatDisplayName }}</h4>
        <p class="file-type-handler__format-description">{{ formatDescription }}</p>
      </div>
      
      <div v-if="features.length > 0" class="file-type-handler__features">
        <h5 class="file-type-handler__features-title">{{ $t('fileTypeHandler.features') }}</h5>
        <ul class="file-type-handler__features-list">
          <li v-for="feature in features" :key="feature" class="file-type-handler__feature-item">
            <Icon name="ic:baseline-check" class="file-type-handler__feature-icon" />
            {{ $t(`fileTypeHandler.features.${feature}`) }}
          </li>
        </ul>
      </div>

      <div v-if="limitations.length > 0" class="file-type-handler__limitations">
        <h5 class="file-type-handler__limitations-title">{{ $t('fileTypeHandler.limitations') }}</h5>
        <ul class="file-type-handler__limitations-list">
          <li v-for="limitation in limitations" :key="limitation" class="file-type-handler__limitation-item">
            <Icon name="ic:baseline-warning" class="file-type-handler__limitation-icon" />
            {{ $t(`fileTypeHandler.limitations.${limitation}`) }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type FileFormat = 'txt' | 'md' | 'markdown' | 'html'
type IconSize = 'small' | 'medium' | 'large' | 'xlarge'

interface Props {
  format: FileFormat
  size?: IconSize
  showBadge?: boolean
  showDetails?: boolean
  clickable?: boolean
}

interface Emits {
  click: [format: FileFormat]
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  showBadge: true,
  showDetails: false,
  clickable: false
})

const emit = defineEmits<Emits>()

// Format information mapping
const formatInfo = {
  txt: {
    name: 'Plain Text',
    description: 'Simple text file with no formatting',
    features: ['plainText', 'lightweight', 'universal'],
    limitations: ['noFormatting', 'noStructure']
  },
  md: {
    name: 'Markdown',
    description: 'Lightweight markup language for formatted text',
    features: ['formatting', 'structure', 'readable', 'portable'],
    limitations: ['limitedStyling']
  },
  markdown: {
    name: 'Markdown',
    description: 'Lightweight markup language for formatted text',
    features: ['formatting', 'structure', 'readable', 'portable'],
    limitations: ['limitedStyling']
  },
  html: {
    name: 'HTML',
    description: 'HyperText Markup Language for web content',
    features: ['richFormatting', 'structure', 'multimedia', 'interactive'],
    limitations: ['complexity', 'webSpecific']
  }
}

// Computed properties
const formatDisplayName = computed(() => formatInfo[props.format]?.name || props.format.toUpperCase())
const formatDescription = computed(() => formatInfo[props.format]?.description || '')
const features = computed(() => formatInfo[props.format]?.features || [])
const limitations = computed(() => formatInfo[props.format]?.limitations || [])

const formatBadgeText = computed(() => {
  switch (props.format) {
    case 'txt': return 'TXT'
    case 'md': return 'MD'
    case 'markdown': return 'MD'
    case 'html': return 'HTML'
    // default: return props.format.toUpperCase()
  }
})

// Event handlers
const handleClick = () => {
  if (props.clickable) {
    emit('click', props.format)
  }
}

// Placeholder for i18n - will be implemented in Phase 9
const $t = (key: string): string => {
  const translations: Record<string, string> = {
    'fileTypeHandler.features': 'Features',
    'fileTypeHandler.limitations': 'Limitations',
    'fileTypeHandler.features.plainText': 'Plain text content',
    'fileTypeHandler.features.lightweight': 'Small file size',
    'fileTypeHandler.features.universal': 'Universal compatibility',
    'fileTypeHandler.features.formatting': 'Text formatting support',
    'fileTypeHandler.features.structure': 'Document structure',
    'fileTypeHandler.features.readable': 'Human-readable markup',
    'fileTypeHandler.features.portable': 'Cross-platform compatible',
    'fileTypeHandler.features.richFormatting': 'Rich text formatting',
    'fileTypeHandler.features.multimedia': 'Images and media support',
    'fileTypeHandler.features.interactive': 'Interactive elements',
    'fileTypeHandler.limitations.noFormatting': 'No text formatting',
    'fileTypeHandler.limitations.noStructure': 'No document structure',
    'fileTypeHandler.limitations.limitedStyling': 'Limited styling options',
    'fileTypeHandler.limitations.complexity': 'Can be complex',
    'fileTypeHandler.limitations.webSpecific': 'Web-specific features'
  }
  return translations[key] || key
}
</script>

<style scoped>
.file-type-handler {
  @apply flex flex-col;
}

.file-type-handler__icon {
  @apply relative flex items-center justify-center rounded-lg transition-all duration-200;
}

.file-type-handler__icon--clickable {
  @apply cursor-pointer hover:scale-105;
}

/* Size variants */
.file-type-handler__icon--small {
  @apply w-6 h-6;
}

.file-type-handler__icon--medium {
  @apply w-8 h-8;
}

.file-type-handler__icon--large {
  @apply w-12 h-12;
}

.file-type-handler__icon--xlarge {
  @apply w-16 h-16;
}

/* Format-specific colors */
.file-type-handler__icon--txt {
  @apply text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700;
}

.file-type-handler__icon--md,
.file-type-handler__icon--markdown {
  @apply text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30;
}

.file-type-handler__icon--html {
  @apply text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30;
}

.file-type-handler__icon svg {
  @apply w-full h-full p-1;
}

.file-type-handler__badge {
  @apply absolute -bottom-1 -right-1 px-1 py-0.5 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm;
}

.file-type-handler__icon--txt .file-type-handler__badge {
  @apply text-gray-700 dark:text-gray-300;
}

.file-type-handler__icon--md .file-type-handler__badge,
.file-type-handler__icon--markdown .file-type-handler__badge {
  @apply text-blue-700 dark:text-blue-300;
}

.file-type-handler__icon--html .file-type-handler__badge {
  @apply text-orange-700 dark:text-orange-300;
}

.file-type-handler__details {
  @apply mt-4 space-y-4;
}

.file-type-handler__format-info {
  @apply space-y-2;
}

.file-type-handler__format-name {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.file-type-handler__format-description {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.file-type-handler__features,
.file-type-handler__limitations {
  @apply space-y-2;
}

.file-type-handler__features-title,
.file-type-handler__limitations-title {
  @apply text-sm font-medium text-gray-900 dark:text-white;
}

.file-type-handler__features-list,
.file-type-handler__limitations-list {
  @apply space-y-1;
}

.file-type-handler__feature-item,
.file-type-handler__limitation-item {
  @apply flex items-center gap-2 text-sm;
}

.file-type-handler__feature-item {
  @apply text-green-700 dark:text-green-300;
}

.file-type-handler__limitation-item {
  @apply text-red-700 dark:text-red-300;
}

.file-type-handler__feature-icon,
.file-type-handler__limitation-icon {
  @apply w-4 h-4 flex-shrink-0;
}

.file-type-handler__feature-icon {
  @apply text-green-500;
}

.file-type-handler__limitation-icon {
  @apply text-red-500;
}

/* Hover effects for clickable icons */
.file-type-handler__icon--clickable:hover {
  @apply shadow-md;
}

.file-type-handler__icon--txt.file-type-handler__icon--clickable:hover {
  @apply bg-gray-200 dark:bg-gray-600;
}

.file-type-handler__icon--md.file-type-handler__icon--clickable:hover,
.file-type-handler__icon--markdown.file-type-handler__icon--clickable:hover {
  @apply bg-blue-200 dark:bg-blue-800/50;
}

.file-type-handler__icon--html.file-type-handler__icon--clickable:hover {
  @apply bg-orange-200 dark:bg-orange-800/50;
}
</style>
