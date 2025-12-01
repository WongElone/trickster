/**
 * Prompt History Management for What-If Scenarios
 * Stores previous submitted prompts and generated content in browser localStorage
 */

/**
 * Context information interface for prompt history
 */
export interface ContextInfo {
  chunksUsed: number
  documentCoverage: number
  chunks: Array<{
    documentFilename: string
    text: string
  }>
}

export interface PromptHistoryItem {
  id: string
  prompt: string
  generatedContent: string
  timestamp: string
  wordCount: number
  contextInfo?: ContextInfo
}

export interface PromptHistory {
  scenarioId: string
  items: PromptHistoryItem[]
  lastUpdated: string
}

/**
 * Get the localStorage key for a scenario's prompt history
 */
const getStorageKey = (scenarioId: string): string => {
  return `trickster_whatif_history_${scenarioId}`
}

/**
 * Load prompt history for a scenario from localStorage
 */
export const loadPromptHistory = (scenarioId: string): PromptHistory => {
  try {
    const stored = localStorage.getItem(getStorageKey(scenarioId))
    if (stored) {
      const history = JSON.parse(stored) as PromptHistory
      // Ensure items are sorted by timestamp (newest first)
      history.items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      return history
    }
  } catch (error) {
    console.error('Failed to load prompt history:', error)
  }

  // Return empty history if none exists or error occurred
  return {
    scenarioId,
    items: [],
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Save prompt history for a scenario to localStorage
 */
export const savePromptHistory = (history: PromptHistory): void => {
  try {
    history.lastUpdated = new Date().toISOString()
    // Keep only the most recent 50 items to prevent localStorage bloat
    if (history.items.length > 50) {
      history.items = history.items.slice(0, 50)
    }
    localStorage.setItem(getStorageKey(history.scenarioId), JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save prompt history:', error)
  }
}

/**
 * Add a new prompt history item
 */
export const addPromptHistoryItem = (
  scenarioId: string,
  prompt: string,
  generatedContent: string,
  contextInfo?: ContextInfo
): PromptHistoryItem => {
  const history = loadPromptHistory(scenarioId)
  
  const newItem: PromptHistoryItem = {
    id: `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    prompt: prompt.trim(),
    generatedContent: generatedContent.trim(),
    timestamp: new Date().toISOString(),
    wordCount: estimateWordCount(generatedContent)
  }

  // Add contextInfo if provided
  if (contextInfo) {
    newItem.contextInfo = {
      chunksUsed: contextInfo.chunksUsed || 0,
      documentCoverage: contextInfo.documentCoverage || 0,
      chunks: contextInfo.chunks || []
    }
  }

  // Add to beginning of array (newest first)
  history.items.unshift(newItem)
  savePromptHistory(history)
  
  return newItem
}

/**
 * Delete a prompt history item
 */
export const deletePromptHistoryItem = (scenarioId: string, itemId: string): void => {
  const history = loadPromptHistory(scenarioId)
  history.items = history.items.filter(item => item.id !== itemId)
  savePromptHistory(history)
}

/**
 * Clear all prompt history for a scenario
 */
export const clearPromptHistory = (scenarioId: string): void => {
  try {
    localStorage.removeItem(getStorageKey(scenarioId))
  } catch (error) {
    console.error('Failed to clear prompt history:', error)
  }
}

/**
 * Estimate word count for text (handles both English and Chinese)
 */
const estimateWordCount = (text: string): number => {
  const trimmedText = text.trim()
  if (trimmedText.length === 0) return 0
  
  // Simple word count estimation
  const sample = trimmedText.substring(0, 100)
  const alphanumericCount = (sample.match(/[a-zA-Z0-9]/g) || []).length
  const alphanumericRatio = alphanumericCount / sample.length
  
  if (alphanumericRatio > 0.5) {
    // Likely English text
    return trimmedText.split(/\s+/).filter(word => word.length > 0).length
  } else {
    // Likely Chinese text
    return trimmedText.length
  }
}

/**
 * Format timestamp for display
 */
export const formatHistoryTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}
