<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="$emit('close')"
    ></div>
    
    <!-- Modal Content -->
    <div class="flex min-h-screen items-center justify-center p-4">
      <div 
        class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-4 flex-1">
            <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Icon name="ic:baseline-auto-awesome" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div class="flex-1">
              <input
                v-model="scenarioTitle"
                placeholder="Enter scenario title..."
                class="text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-full focus:ring-0 p-0"
                :disabled="isGenerating"
              />
              <p v-if="topic" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Exploring "<strong>{{ topic.title }}</strong>"
              </p>
            </div>
          </div>
          <button
            @click="$emit('close')"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors duration-150"
          >
            <Icon name="ic:baseline-close" class="w-6 h-6" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 flex overflow-hidden">
          <!-- What-If Interface -->
          <div class="flex-1 flex flex-col">
            <!-- Input Section -->
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
              <div class="space-y-4">
                <!-- Current Prompt -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What-If Scenario Prompt
                  </label>
                  <textarea
                    v-model="prompt"
                    placeholder="Describe your creative 'What if' scenario... For example: 'What if the main character had made a different choice in chapter 3?'"
                    class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows="3"
                    :disabled="isGenerating"
                  />
                </div>
                
                <!-- Additional Prompt Area (for regeneration) -->
                <div v-if="showAdditionalPrompt" class="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Prompt (Generate Again)
                  </label>
                  <textarea
                    v-model="additionalPrompt"
                    placeholder="Add more details or modify your scenario prompt..."
                    class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows="3"
                    :disabled="isGenerating"
                  />
                </div>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4 flex-wrap">
                    <!-- Generate Button -->
                    <button
                      @click="generateScenario"
                      :disabled="!getCurrentPrompt().trim() || isGenerating"
                      class="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <Icon 
                        :name="isGenerating ? 'ic:baseline-hourglass-empty' : 'ic:baseline-auto-awesome'" 
                        class="w-4 h-4"
                        :class="{ 'animate-spin': isGenerating }"
                      />
                      {{ isGenerating ? 'Generating...' : (showAdditionalPrompt ? 'Generate Again' : 'Generate Scenario') }}
                    </button>
                    
                    <!-- Save Button (Always visible) -->
                    <button
                      @click="saveScenario"
                      :disabled="isSaving || isGenerating || !scenarioTitle.trim() || (!props.existingScenario?.id && !generatedContent)"
                      class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <Icon 
                        :name="isSaving ? 'ic:baseline-hourglass-empty' : 'ic:baseline-save'" 
                        class="w-4 h-4"
                        :class="{ 'animate-spin': isSaving }"
                      />
                      {{ isSaving ? 'Saving...' : (props.existingScenario?.id ? 'Update' : 'Save') }}
                    </button>
                    
                    <!-- Continue Generation Button -->
                    <button
                      v-if="generatedContent && !showAdditionalPrompt && !showContinuedContent"
                      @click="continueGeneration"
                      :disabled="isGenerating || isContinuing"
                      class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <Icon name="ic:baseline-keyboard-double-arrow-right" class="w-4 h-4" />
                      Continue Generation
                    </button>
                    
                    <!-- Generate Again Button -->
                    <button
                      v-if="generatedContent && !showAdditionalPrompt && !showContinuedContent"
                      @click="showAdditionalPrompt = true"
                      :disabled="isGenerating || isContinuing"
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <Icon name="ic:baseline-refresh" class="w-4 h-4" />
                      Generate Again
                    </button>
                    
                    <!-- Cancel Additional Prompt -->
                    <button
                      v-if="showAdditionalPrompt"
                      @click="cancelAdditionalPrompt"
                      :disabled="isGenerating"
                      class="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <Icon name="ic:baseline-close" class="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <button
                      @click="showPromptHistory = true"
                      class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
                      title="View Prompt History"
                    >
                      <Icon name="ic:baseline-history" class="w-5 h-5" />
                    </button>
                    <button
                      @click="showSettings = !showSettings"
                      class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
                      :title="showSettings ? 'Hide Settings' : 'Show Settings'"
                    >
                      <Icon name="ic:baseline-settings" class="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Generated Content Area -->
            <div class="flex-1 p-6 overflow-y-auto">
              <div v-if="!generatedContent && !isGenerating" class="text-center py-12">
                <div class="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="ic:baseline-auto-awesome" class="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ready to Explore</h3>
                <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Enter a creative "What if" prompt above to generate an imaginative scenario based on your uploaded content.
                </p>
              </div>

              <!-- Streaming Content Display -->
              <div v-if="generatedContent || isGenerating" class="space-y-4">
                <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div class="flex items-center gap-2 mb-3">
                    <Icon name="ic:baseline-auto-awesome" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span class="font-medium text-purple-900 dark:text-purple-300">Generated Scenario</span>
                    <div v-if="isGenerating" class="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400">
                      <Icon name="ic:baseline-hourglass-empty" class="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  </div>
                  
                  <div class="prose prose-purple dark:prose-invert max-w-none">
                    <div v-if="generatedContent" v-html="formatContent(generatedContent)"></div>
                    <div v-else-if="isGenerating" class="text-gray-600 dark:text-gray-400 italic">
                      Crafting your creative scenario...
                    </div>
                  </div>
                </div>

                <!-- Continued Content Display -->
                <div v-if="showContinuedContent" class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border-t-4 border-indigo-500">
                  <div class="flex items-center gap-2 mb-3">
                    <Icon name="ic:baseline-keyboard-double-arrow-right" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span class="font-medium text-indigo-900 dark:text-indigo-300">Continued Content</span>
                    <div v-if="isContinuing" class="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400">
                      <Icon name="ic:baseline-hourglass-empty" class="w-4 h-4 animate-spin" />
                      <span>Continuing...</span>
                    </div>
                  </div>
                  
                  <!-- Streaming display while continuing -->
                  <div v-if="isContinuing" class="prose prose-purple dark:prose-invert max-w-none">
                    <div v-if="continuedContent" v-html="formatContent(continuedContent)"></div>
                    <div v-else class="text-gray-600 dark:text-gray-400 italic">
                      Seamlessly continuing your scenario...
                    </div>
                  </div>
                  
                  <!-- Editable textarea after streaming completes -->
                  <div v-else-if="continuedContent">
                    <textarea
                      v-model="continuedContent"
                      class="w-full px-4 py-3 border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows="10"
                      placeholder="Edit the continued content before appending..."
                    />
                  </div>

                  <!-- Append Button -->
                  <div v-if="continuedContent && !isContinuing" class="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
                    <button
                      @click="appendContinuedContent"
                      class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <Icon name="ic:baseline-merge" class="w-4 h-4" />
                      Append to Original Content
                    </button>
                  </div>
                </div>

                <!-- Context Information -->
                <ContextInfoDisplay 
                  :context-info="contextInfo" 
                  :default-expanded="false"
                />
              </div>
            </div>
          </div>

          <!-- Settings Sidebar (Purple Theme) -->
          <ChatSettings
            v-if="showSettings"
            :settings="whatIfSettings"
            title="What-If Settings"
            :show-context-window="true"
            :show-chat-context-window="false"
            :show-temperature="true"
            :show-system-prompt="true"
            :show-clear-button="false"
            :show-save-button="true"
            save-button-text="Save Settings"
            @save="saveSettings"
            class="what-if-settings"
          />
        </div>
      </div>
    </div>

    <!-- Prompt History Modal -->
    <PromptHistoryModal
      :show="showPromptHistory"
      :scenario-id="currentWhatIfId || 'temp'"
      @close="showPromptHistory = false"
      @use-prompt="handleUsePrompt"
      @save-to-database="handleSaveToDatabase"
    />
  </div>
</template>

<script setup lang="ts">
import ChatSettings from '../Chat/ChatSettings.vue'
import PromptHistoryModal from './PromptHistoryModal.vue'
import ContextInfoDisplay from './ContextInfoDisplay.vue'
import { addPromptHistoryItem, type PromptHistoryItem, type ContextInfo } from '../../../lib/prompt-history'
import type { Topic } from '../../../types/database'

interface WhatIfSettings {
  contextWindow: number
  temperature: number
  systemPrompt: string
  maxTokens: number
}

interface Props {
  show: boolean
  topic: Topic | null
  topicId: string
  existingScenario?: {
    id: string
    title: string
    prompt: string | null
    content?: string | null
    word_count?: number | null
    created_at?: string
  } | null
}

interface Emits {
  'close': []
  'scenario-generated': [content: string, metadata: any]
  'scenario-saved': [scenarioId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const prompt = ref('')
const scenarioTitle = ref('')
const additionalPrompt = ref('')
const showAdditionalPrompt = ref(false)
const generatedContent = ref('')
const isGenerating = ref(false)
const isSaving = ref(false)
const showSettings = ref(false)
const showPromptHistory = ref(false)
const contextInfo = ref<any>(null)
const currentWhatIfId = ref<string | null>(null) // Track the what-if ID for prompt history

// Continuation state
const continuedContent = ref('')
const isContinuing = ref(false)
const showContinuedContent = ref(false)

// What-If specific settings (no chat context window)
const whatIfSettings = reactive<WhatIfSettings>({
  contextWindow: 8,
  temperature: 0.8, // Higher temperature for creativity
  systemPrompt: '',
  maxTokens: 2000
})

// Load settings from localStorage
const loadSettings = () => {
  try {
    const stored = localStorage.getItem(`trickster_whatif_${props.topicId}_settings`)
    if (stored) {
      const settings = JSON.parse(stored)
      Object.assign(whatIfSettings, settings)
    }
  } catch (error) {
    console.error('Failed to load What-If settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  try {
    localStorage.setItem(`trickster_whatif_${props.topicId}_settings`, JSON.stringify(whatIfSettings))
    console.log('What-If settings saved')
  } catch (error) {
    console.error('Failed to save What-If settings:', error)
  }
}

// Get current prompt (original or additional)
const getCurrentPrompt = () => {
  return showAdditionalPrompt.value && additionalPrompt.value.trim() 
    ? additionalPrompt.value.trim() 
    : prompt.value.trim()
}

// Cancel additional prompt
const cancelAdditionalPrompt = () => {
  showAdditionalPrompt.value = false
  additionalPrompt.value = ''
}

// Reset continuation state when generating new content
const resetContinuationState = () => {
  continuedContent.value = ''
  showContinuedContent.value = false
  isContinuing.value = false
}

// Handle using a prompt from history
const handleUsePrompt = (item: PromptHistoryItem) => {
  // Set the prompt as the current prompt
  prompt.value = item.prompt
  
  // If there's no title set, use a generated title from the prompt
  if (!scenarioTitle.value.trim()) {
    scenarioTitle.value = generateTitle(item.prompt)
  }
  
  // Close the history modal
  showPromptHistory.value = false
  
  console.log('Using prompt from history:', item.prompt)
}

// Handle saving a prompt+content from history to database
const handleSaveToDatabase = async (item: PromptHistoryItem) => {
  try {
    const whatIfId = props.existingScenario?.id || currentWhatIfId.value
    
    if (whatIfId) {
      // Update existing scenario
      const updateResponse = await fetch(`/api/what-if/${whatIfId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: item.prompt,
          content: item.generatedContent,
          wordCount: item.wordCount
        })
      })

      if (!updateResponse.ok) {
        throw new Error(`Failed to update What-If scenario: ${updateResponse.status}`)
      }

      // Close both modals and emit success
      showPromptHistory.value = false
      emit('close')
      emit('scenario-saved', whatIfId)

      console.log('Existing scenario updated with prompt history item')

      // Show success message
      alert('Scenario updated successfully!')

    } else {
      // Create new scenario (edge case - shouldn't happen often with auto-save)
      const title = generateTitle(item.prompt)

      const createResponse = await fetch('/api/what-if/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: props.topicId,
          title: title,
          prompt: item.prompt
        })
      })

      if (!createResponse.ok) {
        throw new Error(`Failed to create What-If record: ${createResponse.status}`)
      }

      const createData = await createResponse.json()
      const newWhatIfId = createData.whatIf.id
      currentWhatIfId.value = newWhatIfId

      // Update with the generated content
      const updateResponse = await fetch(`/api/what-if/${newWhatIfId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: item.generatedContent,
          wordCount: item.wordCount
        })
      })

      if (!updateResponse.ok) {
        throw new Error(`Failed to save What-If content: ${updateResponse.status}`)
      }

      // Close both modals and emit success
      showPromptHistory.value = false
      emit('close')
      emit('scenario-saved', newWhatIfId)

      console.log('New scenario created from prompt history item')

      // Show success message
      alert('Scenario saved to database successfully!')
    }

  } catch (error) {
    console.error('Error saving prompt history to database:', error)
    alert('Failed to save scenario to database. Please try again.')
  }
}

// Generate What-If scenario using streaming API
const generateScenario = async () => {
  const currentPrompt = getCurrentPrompt()
  if (!currentPrompt || isGenerating.value) return

  isGenerating.value = true
  generatedContent.value = ''
  contextInfo.value = null
  
  // Reset continuation state when generating new content
  resetContinuationState()

  try {
    const response = await fetch('/api/what-if/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: currentPrompt,
        topicId: props.topicId,
        contextOptions: {
          maxChunks: whatIfSettings.contextWindow,
          strategy: 'comprehensive'
        },
        generationOptions: {
          temperature: whatIfSettings.temperature,
          maxTokens: whatIfSettings.maxTokens
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'metadata') {
                // Store initial metadata
                console.log('What-If generation started:', data)
              } else if (data.type === 'content') {
                // Append streaming content
                generatedContent.value += data.chunk
              } else if (data.type === 'complete') {
                // Generation complete
                contextInfo.value = data.context
                
                // Auto-save to database if this is a new scenario (to get an ID for prompt history)
                if (!currentWhatIfId.value) {
                  try {
                    const title = scenarioTitle.value.trim() || generateTitle(currentPrompt)
                    const createResponse = await fetch('/api/what-if/create', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        topicId: props.topicId,
                        title: title,
                        prompt: currentPrompt
                      })
                    })

                    if (!createResponse.ok) {
                      throw new Error(`Failed to create What-If record: ${createResponse.status}`)
                    }

                    const createData = await createResponse.json()
                    currentWhatIfId.value = createData.whatIf.id
                    
                    // Update title if it was auto-generated
                    if (!scenarioTitle.value.trim()) {
                      scenarioTitle.value = title
                    }
                    
                    console.log('What-If auto-saved with ID:', currentWhatIfId.value)
                  } catch (error) {
                    console.error('Error auto-saving What-If:', error)
                    // Continue with temp ID if auto-save fails
                  }
                }
                
                // Save to prompt history using the what-if ID
                if (generatedContent.value.trim() && currentWhatIfId.value) {
                  addPromptHistoryItem(
                    currentWhatIfId.value,
                    currentPrompt,
                    generatedContent.value,
                    data.context
                  )
                  console.log('Prompt and generated content saved to history')
                }
                
                // Update main prompt with additional prompt for future operations
                // This ensures "Continue Generation" uses the new prompt chain
                if (showAdditionalPrompt.value && additionalPrompt.value.trim()) {
                  prompt.value = additionalPrompt.value.trim()
                  showAdditionalPrompt.value = false
                  additionalPrompt.value = ''
                }
                
                emit('scenario-generated', generatedContent.value, data)
                console.log('What-If generation completed:', data)
                break
              } else if (data.type === 'error') {
                throw new Error(data.details || 'Generation failed')
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError, 'Line:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

  } catch (error) {
    console.error('Error generating What-If scenario:', error)
    generatedContent.value = 'Sorry, there was an error generating your What-If scenario. Please try again.'
  } finally {
    isGenerating.value = false
  }
}

// Continue generation with existing content
const continueGeneration = async () => {
  if (!generatedContent.value || isContinuing.value) return

  isContinuing.value = true
  continuedContent.value = ''
  showContinuedContent.value = true

  try {
    const response = await fetch('/api/what-if/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: getCurrentPrompt(),
        topicId: props.topicId,
        unfinished_content: generatedContent.value, // Pass existing content for continuation
        contextOptions: {
          maxChunks: whatIfSettings.contextWindow,
          strategy: 'comprehensive'
        },
        generationOptions: {
          temperature: whatIfSettings.temperature,
          maxTokens: whatIfSettings.maxTokens
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body reader available')
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'metadata') {
                console.log('Continuation started:', data)
              } else if (data.type === 'content') {
                // Append streaming content
                continuedContent.value += data.chunk
              } else if (data.type === 'complete') {
                console.log('Continuation completed:', data)
                break
              } else if (data.type === 'error') {
                throw new Error(data.details || 'Continuation failed')
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError, 'Line:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

  } catch (error) {
    console.error('Error continuing What-If scenario:', error)
    continuedContent.value = 'Sorry, there was an error continuing your What-If scenario. Please try again.'
  } finally {
    isContinuing.value = false
  }
}

// Append continued content to original and save
const appendContinuedContent = async () => {
  if (!continuedContent.value) return

  try {
    // Concatenate the content without extra newlines
    const concatenatedContent = generatedContent.value + continuedContent.value
    
    // Update the generated content
    generatedContent.value = concatenatedContent
    
    // Update prompt history with concatenated content
    if (currentWhatIfId.value) {
      const currentPrompt = getCurrentPrompt()
      addPromptHistoryItem(
        currentWhatIfId.value,
        currentPrompt,
        concatenatedContent,
        contextInfo.value
      )
      console.log('Updated prompt history with concatenated content')
    }
    
    // Save to database
    const whatIfId = props.existingScenario?.id || currentWhatIfId.value
    if (whatIfId) {
      const updateResponse = await fetch(`/api/what-if/${whatIfId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: concatenatedContent,
          wordCount: estimateWordCount(concatenatedContent)
        })
      })

      if (!updateResponse.ok) {
        throw new Error(`Failed to update What-If scenario: ${updateResponse.status}`)
      }

      console.log('Concatenated content saved to database')
    }
    
    // Reset continuation state
    continuedContent.value = ''
    showContinuedContent.value = false
    
    // Show success message
    alert('Content successfully appended and saved!')
    
  } catch (error) {
    console.error('Error appending continued content:', error)
    alert('Failed to append content. Please try again.')
  }
}

// Save or update scenario
const saveScenario = async () => {
  if (isSaving.value || !scenarioTitle.value.trim()) return

  isSaving.value = true

  try {
    const whatIfId = props.existingScenario?.id || currentWhatIfId.value
    
    if (whatIfId) {
      // Update existing scenario (either from prop or auto-created)
      const updateResponse = await fetch(`/api/what-if/${whatIfId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: scenarioTitle.value.trim(),
          prompt: getCurrentPrompt(),
          content: generatedContent.value || props.existingScenario?.content,
          wordCount: generatedContent.value ? estimateWordCount(generatedContent.value) : undefined
        })
      })

      if (!updateResponse.ok) {
        throw new Error(`Failed to update What-If scenario: ${updateResponse.status}`)
      }

      emit('scenario-saved', whatIfId)
      console.log('What-If scenario updated successfully')
    } else {
      // This should rarely happen now since we auto-create on generation
      // But keep as fallback for edge cases
      if (!generatedContent.value) {
        alert('Please generate content before saving.')
        return
      }

      const createResponse = await fetch('/api/what-if/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: props.topicId,
          title: scenarioTitle.value.trim(),
          prompt: getCurrentPrompt()
        })
      })

      if (!createResponse.ok) {
        throw new Error(`Failed to create What-If record: ${createResponse.status}`)
      }

      const createData = await createResponse.json()
      const newWhatIfId = createData.whatIf.id
      currentWhatIfId.value = newWhatIfId

      // Then update with the generated content
      const updateResponse = await fetch(`/api/what-if/${newWhatIfId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedContent.value,
          wordCount: estimateWordCount(generatedContent.value)
        })
      })

      if (!updateResponse.ok) {
        throw new Error(`Failed to save What-If content: ${updateResponse.status}`)
      }

      emit('scenario-saved', newWhatIfId)
      console.log('What-If scenario created successfully')
    }
    
    // Reset for next generation (only if creating new)
    if (!props.existingScenario?.id) {
      prompt.value = ''
      scenarioTitle.value = ''
      additionalPrompt.value = ''
      showAdditionalPrompt.value = false
      generatedContent.value = ''
      contextInfo.value = null
      currentWhatIfId.value = null
      continuedContent.value = ''
      showContinuedContent.value = false
    }
    
  } catch (error) {
    console.error('Error saving What-If scenario:', error)
    alert('Failed to save scenario. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// Utility functions
const formatContent = (content: string): string => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)/, '<p>$1')
    .replace(/(.+)$/, '$1</p>')
}

const generateTitle = (promptText: string): string => {
  const words = promptText.trim().split(/\s+/).slice(0, 8)
  return words.join(' ') + (promptText.split(/\s+/).length > 8 ? '...' : '')
}

const estimateWordCount = (text: string): number => {
  const trimmedText = text.trim()
  if (trimmedText.length === 0) return 0
  
  // Simple word count estimation
  const sample = trimmedText.substring(0, 100)
  const alphanumericCount = (sample.match(/[a-zA-Z0-9]/g) || []).length
  const alphanumericRatio = alphanumericCount / sample.length
  
  if (alphanumericRatio > 0.5) {
    return trimmedText.split(/\s+/).filter(word => word.length > 0).length
  } else {
    return trimmedText.length
  }
}

// Load settings on mount
onMounted(() => {
  loadSettings()
})

// Watch for modal show/hide to reset or load state
watch(() => props.show, (newShow) => {
  if (newShow) {
    if (props.existingScenario) {
      // Load existing scenario data
      scenarioTitle.value = props.existingScenario.title || ''
      prompt.value = props.existingScenario.prompt || ''
      generatedContent.value = props.existingScenario.content || ''
      additionalPrompt.value = ''
      showAdditionalPrompt.value = false
      contextInfo.value = null
      currentWhatIfId.value = props.existingScenario.id
      // Reset continuation state
      continuedContent.value = ''
      showContinuedContent.value = false
    } else {
      // Reset state for new scenario
      prompt.value = ''
      scenarioTitle.value = ''
      additionalPrompt.value = ''
      showAdditionalPrompt.value = false
      generatedContent.value = ''
      contextInfo.value = null
      currentWhatIfId.value = null
      // Reset continuation state
      continuedContent.value = ''
      showContinuedContent.value = false
    }
  }
})
</script>

<style scoped>
.what-if-settings {
  /* Purple theme overrides for settings sidebar */
  --tw-ring-color: rgb(147 51 234);
}

.what-if-settings :deep(.bg-blue-600) {
  background-color: rgb(147 51 234);
}

.what-if-settings :deep(.hover\:bg-blue-700:hover) {
  background-color: rgb(126 34 206);
}

.what-if-settings :deep(.focus\:ring-blue-500:focus) {
  --tw-ring-color: rgb(147 51 234);
}

.what-if-settings :deep(.focus\:border-blue-500:focus) {
  border-color: rgb(147 51 234);
}

.prose-purple {
  --tw-prose-links: rgb(147 51 234);
  --tw-prose-headings: rgb(88 28 135);
  --tw-prose-bold: rgb(88 28 135);
  --tw-prose-counters: rgb(147 51 234);
  --tw-prose-bullets: rgb(196 181 253);
  --tw-prose-hr: rgb(233 213 255);
  --tw-prose-quotes: rgb(88 28 135);
  --tw-prose-quote-borders: rgb(196 181 253);
  --tw-prose-captions: rgb(107 114 128);
  --tw-prose-code: rgb(88 28 135);
  --tw-prose-pre-code: rgb(233 213 255);
  --tw-prose-pre-bg: rgb(59 7 100);
  --tw-prose-th-borders: rgb(196 181 253);
  --tw-prose-td-borders: rgb(233 213 255);
}
</style>
