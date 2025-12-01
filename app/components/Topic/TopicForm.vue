<template>
  <div class="topic-form">
    <!-- Form Header -->
    <div class="topic-form__header">
      <h3 class="topic-form__title">
        {{ isEditing ? $t('topicForm.editTitle') : $t('topicForm.createTitle') }}
      </h3>
      <button
        v-if="showCloseButton"
        class="topic-form__close-btn"
        :title="$t('topicForm.close')"
        @click="$emit('close')"
        :disabled="loading"
      >
        <Icon name="ic:baseline-close" class="icon" />
      </button>
    </div>

    <!-- Form Content -->
    <form @submit.prevent="handleSubmit" class="topic-form__form">
      <!-- Title Field -->
      <div class="topic-form__field">
        <label for="topic-title" class="topic-form__label">
          {{ $t('topicForm.titleLabel') }}
          <span class="topic-form__required">*</span>
        </label>
        <input
          id="topic-title"
          v-model="formData.title"
          type="text"
          class="topic-form__input"
          :class="{
            'topic-form__input--error': errors.title,
            'topic-form__input--disabled': loading
          }"
          :placeholder="$t('topicForm.titlePlaceholder')"
          :disabled="loading"
          :maxlength="200"
          @blur="validateTitle"
          @input="clearError('title')"
        />
        <div class="topic-form__field-info">
          <span v-if="errors.title" class="topic-form__error">
            {{ errors.title }}
          </span>
          <span class="topic-form__char-count" :class="{ 'topic-form__char-count--warning': formData.title.length > 180 }">
            {{ formData.title.length }}/200
          </span>
        </div>
      </div>

      <!-- Description Field -->
      <div class="topic-form__field">
        <label for="topic-description" class="topic-form__label">
          {{ $t('topicForm.descriptionLabel') }}
        </label>
        <textarea
          id="topic-description"
          v-model="formData.description"
          class="topic-form__textarea"
          :class="{
            'topic-form__textarea--error': errors.description,
            'topic-form__textarea--disabled': loading
          }"
          :placeholder="$t('topicForm.descriptionPlaceholder')"
          :disabled="loading"
          :maxlength="1000"
          rows="4"
          @blur="validateDescription"
          @input="clearError('description')"
        />
        <div class="topic-form__field-info">
          <span v-if="errors.description" class="topic-form__error">
            {{ errors.description }}
          </span>
          <span class="topic-form__char-count" :class="{ 'topic-form__char-count--warning': formData.description.length > 900 }">
            {{ formData.description.length }}/1000
          </span>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="topic-form__actions">
        <button
          v-if="showCancelButton"
          type="button"
          class="topic-form__btn topic-form__btn--secondary"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ $t('topicForm.cancel') }}
        </button>
        <button
          type="submit"
          class="topic-form__btn topic-form__btn--primary"
          :disabled="loading || !isFormValid"
        >
          <div v-if="loading" class="spinner"></div>
          {{ loading 
            ? (isEditing ? $t('topicForm.updating') : $t('topicForm.creating'))
            : (isEditing ? $t('topicForm.update') : $t('topicForm.create'))
          }}
        </button>
      </div>
    </form>

    <!-- Form Footer -->
    <div v-if="showFooter" class="topic-form__footer">
      <p class="topic-form__footer-text">
        {{ $t('topicForm.footerText') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import type { Topic, TopicInsert, TopicUpdate } from '../../../types/database'

interface Props {
  topic?: Topic
  loading?: boolean
  showCloseButton?: boolean
  showCancelButton?: boolean
  showFooter?: boolean
}

interface Emits {
  submit: [data: TopicInsert | TopicUpdate]
  cancel: []
  close: []
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showCloseButton: true,
  showCancelButton: true,
  showFooter: false
})

const emit = defineEmits<Emits>()

// Form state
const formData = reactive({
  title: props.topic?.title || '',
  description: props.topic?.description || ''
})

const errors = reactive({
  title: '',
  description: ''
})

// Computed properties
const isEditing = computed(() => !!props.topic)

const isFormValid = computed(() => {
  return formData.title.trim().length > 0 && 
         formData.title.length <= 200 && 
         formData.description.length <= 1000 &&
         !errors.title && 
         !errors.description
})

// Validation methods
const validateTitle = () => {
  const title = formData.title.trim()
  
  if (!title) {
    errors.title = $t('topicForm.errors.titleRequired')
    return false
  }
  
  if (title.length > 200) {
    errors.title = $t('topicForm.errors.titleTooLong')
    return false
  }
  
  errors.title = ''
  return true
}

const validateDescription = () => {
  if (formData.description.length > 1000) {
    errors.description = $t('topicForm.errors.descriptionTooLong')
    return false
  }
  
  errors.description = ''
  return true
}

const validateForm = () => {
  const titleValid = validateTitle()
  const descriptionValid = validateDescription()
  return titleValid && descriptionValid
}

// Event handlers
const clearError = (field: keyof typeof errors) => {
  errors[field] = ''
}

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }

  const submitData = isEditing.value 
    ? {
        id: props.topic!.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        updated_at: new Date().toISOString()
      } as TopicUpdate
    : {
        title: formData.title.trim(),
        description: formData.description.trim() || null
      } as TopicInsert

  emit('submit', submitData)
}

const handleCancel = () => {
  // Reset form to original values
  if (props.topic) {
    formData.title = props.topic.title
    formData.description = props.topic.description || ''
  } else {
    formData.title = ''
    formData.description = ''
  }
  
  // Clear errors
  errors.title = ''
  errors.description = ''
  
  emit('cancel')
}

// Watch for prop changes
watch(() => props.topic, (newTopic) => {
  if (newTopic) {
    formData.title = newTopic.title
    formData.description = newTopic.description || ''
  } else {
    formData.title = ''
    formData.description = ''
  }
  
  // Clear errors when topic changes
  errors.title = ''
  errors.description = ''
}, { immediate: true })

// Placeholder for i18n - will be implemented in Phase 9
const $t = (key: string): string => {
  const translations: Record<string, string> = {
    'topicForm.createTitle': 'Create New Topic',
    'topicForm.editTitle': 'Edit Topic',
    'topicForm.close': 'Close',
    'topicForm.titleLabel': 'Title',
    'topicForm.titlePlaceholder': 'Enter a descriptive title for your topic',
    'topicForm.descriptionLabel': 'Description',
    'topicForm.descriptionPlaceholder': 'Provide additional details about this topic (optional)',
    'topicForm.cancel': 'Cancel',
    'topicForm.create': 'Create Topic',
    'topicForm.update': 'Update Topic',
    'topicForm.creating': 'Creating...',
    'topicForm.updating': 'Updating...',
    'topicForm.footerText': 'Topics help organize your content and enable targeted AI interactions.',
    'topicForm.errors.titleRequired': 'Title is required',
    'topicForm.errors.titleTooLong': 'Title must be 200 characters or less',
    'topicForm.errors.descriptionTooLong': 'Description must be 1000 characters or less'
  }
  return translations[key] || key
}
</script>

<style scoped>
@reference "~/assets/css/main.css";

.topic-form {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden;
}

.topic-form__header {
  @apply flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700;
}

.topic-form__title {
  @apply text-xl font-semibold text-gray-900 dark:text-white;
}

.topic-form__close-btn {
  @apply p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.topic-form__form {
  @apply p-6 space-y-6;
}

.topic-form__field {
  @apply space-y-2;
}

.topic-form__label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.topic-form__required {
  @apply text-red-500;
}

.topic-form__input {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150;
}

.topic-form__input--error {
  @apply border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500;
}

.topic-form__input--disabled {
  @apply bg-gray-50 dark:bg-gray-800 cursor-not-allowed;
}

.topic-form__textarea {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150;
}

.topic-form__textarea--error {
  @apply border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500;
}

.topic-form__textarea--disabled {
  @apply bg-gray-50 dark:bg-gray-800 cursor-not-allowed;
}

.topic-form__field-info {
  @apply flex justify-between items-center;
}

.topic-form__error {
  @apply text-sm text-red-600 dark:text-red-400;
}

.topic-form__char-count {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.topic-form__char-count--warning {
  @apply text-orange-500 dark:text-orange-400;
}

.topic-form__actions {
  @apply flex justify-end gap-3 pt-4;
}

.topic-form__btn {
  @apply flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.topic-form__btn--primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600;
}

.topic-form__btn--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600;
}

.topic-form__footer {
  @apply px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600;
}

.topic-form__footer-text {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.icon {
  @apply w-4 h-4;
}

.spinner {
  @apply w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin;
}
</style>
