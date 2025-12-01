<template>
  <div class="file-upload">
    <!-- Upload Area -->
    <div
      class="file-upload__dropzone"
      :class="{
        'file-upload__dropzone--active': isDragActive,
        'file-upload__dropzone--error': hasError,
        'file-upload__dropzone--disabled': disabled
      }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <!-- Hidden File Input -->
      <input
        ref="fileInputRef"
        type="file"
        class="file-upload__input"
        :accept="acceptedFormats"
        :multiple="multiple"
        :disabled="disabled"
        @change="handleFileSelect"
      />

      <!-- Upload Content -->
      <div class="file-upload__content">
        <!-- Icon -->
        <div class="file-upload__icon">
          <Icon v-if="!isDragActive" name="ic:baseline-description" class="w-12 h-12 text-gray-400 dark:text-gray-500" />
          <Icon v-else name="ic:baseline-cloud-upload" class="w-12 h-12" />
        </div>

        <!-- Text Content -->
        <div class="file-upload__text">
          <h3 class="file-upload__title">
            {{ isDragActive ? $t('fileUpload.dropFiles') : $t('fileUpload.title') }}
          </h3>
          <p class="file-upload__description">
            {{ isDragActive ? $t('fileUpload.dropDescription') : $t('fileUpload.description') }}
          </p>
          <p class="file-upload__formats">
            {{ $t('fileUpload.supportedFormats') }}: {{ supportedFormatsText }}
          </p>
          <p class="file-upload__limits">
            {{ $t('fileUpload.limits', { 
              maxSize: formatFileSize(maxFileSize), 
              maxFiles: maxFiles 
            }) }}
          </p>
        </div>

        <!-- Browse Button -->
        <button
          v-if="!isDragActive"
          type="button"
          class="file-upload__browse-btn"
          :disabled="disabled"
          @click.stop="triggerFileInput"
        >
          {{ $t('fileUpload.browse') }}
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="hasError" class="file-upload__error">
      <Icon name="ic:baseline-error" class="file-upload__error-icon" />
      <span class="file-upload__error-text">{{ errorMessage }}</span>
    </div>

    <!-- Upload Progress -->
    <div v-if="uploadProgress.length > 0" class="file-upload__progress">
      <h4 class="file-upload__progress-title">{{ $t('fileUpload.uploading') }}</h4>
      <div class="file-upload__progress-list">
        <div
          v-for="progress in uploadProgress"
          :key="progress.filename"
          class="file-upload__progress-item"
        >
          <div class="file-upload__progress-info">
            <span class="file-upload__progress-filename">{{ progress.filename }}</span>
            <span class="file-upload__progress-status" :class="`file-upload__progress-status--${progress.status}`">
              {{ $t(`fileUpload.status.${progress.status}`) }}
            </span>
          </div>
          <div class="file-upload__progress-bar">
            <div
              class="file-upload__progress-fill"
              :class="{
                'file-upload__progress-fill--error': progress.status === 'error',
                'file-upload__progress-fill--complete': progress.status === 'completed'
              }"
              :style="{ width: `${progress.progress}%` }"
            />
          </div>
          <div v-if="progress.error" class="file-upload__progress-error">
            {{ progress.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Files Preview -->
    <div v-if="selectedFiles.length > 0 && !isUploading" class="file-upload__preview">
      <div class="file-upload__preview-header">
        <h4 class="file-upload__preview-title">
          {{ $t('fileUpload.selectedFiles', { count: selectedFiles.length }) }}
        </h4>
        <button
          class="file-upload__clear-btn"
          @click="clearSelectedFiles"
          :disabled="disabled"
        >
          {{ $t('fileUpload.clear') }}
        </button>
      </div>
      <div class="file-upload__preview-list">
        <div
          v-for="(file, index) in selectedFiles"
          :key="`${file.name}-${index}`"
          class="file-upload__preview-item"
        >
          <div class="file-upload__preview-info">
            <span class="file-upload__preview-name">{{ file.name }}</span>
            <span class="file-upload__preview-size">{{ formatFileSize(file.size) }}</span>
            <span class="file-upload__preview-type">{{ getFileExtension(file.name) }}</span>
          </div>
          <button
            class="file-upload__remove-btn"
            @click="removeFile(index)"
            :disabled="disabled"
            :title="$t('fileUpload.removeFile')"
          >
            <Icon name="ic:baseline-close" />
          </button>
        </div>
      </div>
      <div class="file-upload__preview-actions">
        <button
          class="file-upload__upload-btn"
          @click="uploadFiles"
          :disabled="disabled || selectedFiles.length === 0"
        >
          {{ $t('fileUpload.uploadFiles', { count: selectedFiles.length }) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

interface FileUploadProgress {
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

interface Props {
  topicId?: string
  multiple?: boolean
  disabled?: boolean
  maxFileSize?: number
  maxFiles?: number
  supportedFormats?: string[]
  autoUpload?: boolean
}

interface Emits {
  'files-selected': [files: File[]]
  'upload-start': [files: File[]]
  'upload-progress': [progress: FileUploadProgress[]]
  'upload-complete': [results: any]
  'upload-error': [error: string]
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true,
  disabled: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  supportedFormats: () => ['txt', 'md', 'markdown', 'html'],
  autoUpload: false
})

const emit = defineEmits<Emits>()

// Refs
const fileInputRef = ref<HTMLInputElement>()
const isDragActive = ref(false)
const dragCounter = ref(0)
const selectedFiles = ref<File[]>([])
const uploadProgress = reactive<FileUploadProgress[]>([])
const errorMessage = ref('')

// Computed
const hasError = computed(() => !!errorMessage.value)
const isUploading = computed(() => uploadProgress.some(p => p.status === 'uploading' || p.status === 'processing'))

const acceptedFormats = computed(() => {
  return props.supportedFormats.map(format => `.${format}`).join(',')
})

const supportedFormatsText = computed(() => {
  return props.supportedFormats.map(format => `.${format}`).join(', ')
})

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

const validateFile = (file: File): string | null => {
  // Check file size
  if (file.size > props.maxFileSize) {
    return $t('fileUpload.errors.fileTooLarge', { 
      filename: file.name, 
      maxSize: formatFileSize(props.maxFileSize) 
    })
  }

  // Check file format
  const extension = getFileExtension(file.name)
  if (!props.supportedFormats.includes(extension)) {
    return $t('fileUpload.errors.unsupportedFormat', { 
      filename: file.name, 
      formats: supportedFormatsText.value 
    })
  }

  return null
}

const validateFiles = (files: File[]): string | null => {
  // Check number of files
  if (files.length > props.maxFiles) {
    return $t('fileUpload.errors.tooManyFiles', { maxFiles: props.maxFiles })
  }

  // Check total selected files
  const totalFiles = selectedFiles.value.length + files.length
  if (totalFiles > props.maxFiles) {
    return $t('fileUpload.errors.totalFilesExceeded', { maxFiles: props.maxFiles })
  }

  // Validate each file
  for (const file of files) {
    const error = validateFile(file)
    if (error) return error
  }

  return null
}

// Event handlers
const clearError = () => {
  errorMessage.value = ''
}

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  dragCounter.value++
  isDragActive.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragActive.value = false
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  
  isDragActive.value = false
  dragCounter.value = 0
  
  if (props.disabled) return
  
  const files = Array.from(e.dataTransfer?.files || [])
  processFiles(files)
}

const triggerFileInput = () => {
  if (!props.disabled) {
    fileInputRef.value?.click()
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  processFiles(files)
  
  // Reset input
  target.value = ''
}

const processFiles = (files: File[]) => {
  clearError()
  
  if (files.length === 0) return
  
  const validationError = validateFiles(files)
  if (validationError) {
    errorMessage.value = validationError
    return
  }
  
  // Add files to selection
  selectedFiles.value.push(...files)
  emit('files-selected', [...selectedFiles.value])
  
  // Auto upload if enabled
  if (props.autoUpload) {
    uploadFiles()
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
  emit('files-selected', [...selectedFiles.value])
}

const clearSelectedFiles = () => {
  selectedFiles.value = []
  emit('files-selected', [])
}

const uploadFiles = async () => {
  if (!props.topicId || selectedFiles.value.length === 0) {
    errorMessage.value = $t('fileUpload.errors.noTopicOrFiles')
    return
  }
  
  clearError()
  
  // Initialize progress tracking
  uploadProgress.splice(0)
  selectedFiles.value.forEach(file => {
    uploadProgress.push({
      filename: file.name,
      progress: 0,
      status: 'pending'
    })
  })
  
  emit('upload-start', [...selectedFiles.value])
  emit('upload-progress', [...uploadProgress])
  
  try {
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('topicId', props.topicId)
    
    selectedFiles.value.forEach(file => {
      formData.append('files', file)
    })
    
    // Update progress to uploading
    uploadProgress.forEach(progress => {
      progress.status = 'uploading'
      progress.progress = 10
    })
    emit('upload-progress', [...uploadProgress])
    
    // Upload files
    const response = await $fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    })
    
    // Update progress to processing
    uploadProgress.forEach(progress => {
      progress.status = 'processing'
      progress.progress = 80
    })
    emit('upload-progress', [...uploadProgress])
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mark as completed
    uploadProgress.forEach(progress => {
      progress.status = 'completed'
      progress.progress = 100
    })
    emit('upload-progress', [...uploadProgress])
    emit('upload-complete', response)
    
    // Clear selected files after successful upload
    selectedFiles.value = []
    
    // Clear progress after delay
    setTimeout(() => {
      uploadProgress.splice(0)
    }, 2000)
    
  } catch (error: any) {
    console.error('Upload error:', error)
    
    // Mark all as error
    uploadProgress.forEach(progress => {
      progress.status = 'error'
      progress.error = error.data?.message || error.message || 'Upload failed'
    })
    emit('upload-progress', [...uploadProgress])
    emit('upload-error', error.data?.message || error.message || 'Upload failed')
  }
}

// Placeholder for i18n - will be implemented in Phase 9
const $t = (key: string, params?: Record<string, any>): string => {
  const translations: Record<string, string> = {
    'fileUpload.title': 'Upload Documents',
    'fileUpload.description': 'Drag and drop files here, or click to browse',
    'fileUpload.dropFiles': 'Drop files here',
    'fileUpload.dropDescription': 'Release to upload your files',
    'fileUpload.supportedFormats': 'Supported formats',
    'fileUpload.limits': `Max ${params?.['maxSize'] || '10MB'} per file, up to ${params?.['maxFiles'] || 10} files`,
    'fileUpload.browse': 'Browse Files',
    'fileUpload.uploading': 'Uploading Files...',
    'fileUpload.selectedFiles': `${params?.['count'] || 0} files selected`,
    'fileUpload.clear': 'Clear All',
    'fileUpload.removeFile': 'Remove file',
    'fileUpload.uploadFiles': `Upload ${params?.['count'] || 0} files`,
    'fileUpload.status.pending': 'Pending',
    'fileUpload.status.uploading': 'Uploading',
    'fileUpload.status.processing': 'Processing',
    'fileUpload.status.completed': 'Completed',
    'fileUpload.status.error': 'Error',
    'fileUpload.errors.fileTooLarge': `${params?.['filename']} is too large. Maximum size is ${params?.['maxSize']}`,
    'fileUpload.errors.unsupportedFormat': `${params?.['filename']} has unsupported format. Supported: ${params?.['formats']}`,
    'fileUpload.errors.tooManyFiles': `Too many files selected. Maximum is ${params?.['maxFiles']}`,
    'fileUpload.errors.totalFilesExceeded': `Total files would exceed limit of ${params?.['maxFiles']}`,
    'fileUpload.errors.noTopicOrFiles': 'Topic ID is required and files must be selected'
  }
  return translations[key] || key
}
</script>

<style scoped>
@reference "~/assets/css/main.css";

.file-upload {
  @apply w-full;
}

.file-upload__dropzone {
  @apply relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20;
}

.file-upload__dropzone--active {
  @apply border-blue-500 bg-blue-50 dark:bg-blue-900/30;
}

.file-upload__dropzone--error {
  @apply border-red-300 dark:border-red-600 bg-red-50/50 dark:bg-red-900/20;
}

.file-upload__dropzone--disabled {
  @apply opacity-50 cursor-not-allowed hover:border-gray-300 hover:bg-transparent dark:hover:border-gray-600;
}

.file-upload__input {
  @apply hidden;
}

.file-upload__content {
  @apply flex flex-col items-center gap-4;
}

.file-upload__text {
  @apply text-center;
}

.file-upload__title {
  @apply text-lg font-medium text-gray-900 dark:text-white mb-2;
}

.file-upload__description {
  @apply text-gray-600 dark:text-gray-400 mb-2;
}

.file-upload__formats {
  @apply text-sm text-gray-500 dark:text-gray-400 mb-1;
}

.file-upload__limits {
  @apply text-xs text-gray-400 dark:text-gray-500;
}

.file-upload__browse-btn {
  @apply px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.file-upload__error {
  @apply flex items-center gap-2 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md;
}

.file-upload__error-icon {
  @apply w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0;
}

.file-upload__error-text {
  @apply text-sm text-red-700 dark:text-red-300;
}

.file-upload__progress {
  @apply mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg;
}

.file-upload__progress-title {
  @apply text-sm font-medium text-gray-900 dark:text-white mb-3;
}

.file-upload__progress-list {
  @apply space-y-3;
}

.file-upload__progress-item {
  @apply space-y-2;
}

.file-upload__progress-info {
  @apply flex justify-between items-center;
}

.file-upload__progress-filename {
  @apply text-sm text-gray-700 dark:text-gray-300 truncate flex-1 mr-2;
}

.file-upload__progress-status {
  @apply text-xs px-2 py-1 rounded-full font-medium;
}

.file-upload__progress-status--pending {
  @apply bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300;
}

.file-upload__progress-status--uploading {
  @apply bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300;
}

.file-upload__progress-status--processing {
  @apply bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300;
}

.file-upload__progress-status--completed {
  @apply bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300;
}

.file-upload__progress-status--error {
  @apply bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300;
}

.file-upload__progress-bar {
  @apply w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2;
}

.file-upload__progress-fill {
  @apply h-full bg-blue-600 rounded-full transition-all duration-300;
}

.file-upload__progress-fill--error {
  @apply bg-red-500;
}

.file-upload__progress-fill--complete {
  @apply bg-green-500;
}

.file-upload__progress-error {
  @apply text-xs text-red-600 dark:text-red-400 mt-1;
}

.file-upload__preview {
  @apply mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg;
}

.file-upload__preview-header {
  @apply flex justify-between items-center mb-4;
}

.file-upload__preview-title {
  @apply text-sm font-medium text-gray-900 dark:text-white;
}

.file-upload__clear-btn {
  @apply text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.file-upload__preview-list {
  @apply space-y-2 mb-4;
}

.file-upload__preview-item {
  @apply flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600;
}

.file-upload__preview-info {
  @apply flex items-center gap-3 flex-1 min-w-0;
}

.file-upload__preview-name {
  @apply text-sm text-gray-900 dark:text-white truncate flex-1;
}

.file-upload__preview-size {
  @apply text-xs text-gray-500 dark:text-gray-400;
}

.file-upload__preview-type {
  @apply text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full font-medium;
}

.file-upload__remove-btn {
  @apply p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}

.file-upload__remove-btn svg {
  @apply w-4 h-4;
}

.file-upload__preview-actions {
  @apply flex justify-end;
}

.file-upload__upload-btn {
  @apply px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
