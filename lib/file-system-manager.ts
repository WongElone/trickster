/**
 * File System Manager for What-If Content
 * Handles persistent storage of What-If scenarios to the file system
 */
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { logger } from '../utils/logger'

export interface WhatIfContent {
  id: string
  topicId: string
  prompt: string
  content: string
  createdAt: string
  metadata: {
    wordCount: number
    characterCount: number
    model: string
    temperature: number
    contextChunks: number
    processingTime: number
  }
}

export interface WhatIfMetadata {
  topicId: string
  totalScenarios: number
  lastGenerated: string
  scenarios: Array<{
    id: string
    filename: string
    prompt: string
    createdAt: string
    wordCount: number
  }>
}

export class FileSystemManager {
  private basePath: string

  constructor(basePath: string = './generated-content') {
    this.basePath = basePath
  }

  /**
   * Initialize directory structure for a topic
   */
  async initializeTopicDirectory(topicId: string): Promise<void> {
    const topicPath = this.getTopicPath(topicId)
    const whatIfPath = join(topicPath, 'what-ifs')
    
    try {
      await fs.mkdir(whatIfPath, { recursive: true })
      logger.debug('Initialized topic directory', { topicId, path: whatIfPath })
    } catch (error) {
      logger.error('Failed to initialize topic directory', { topicId, error })
      throw new Error(`Failed to create directory for topic ${topicId}`)
    }
  }

  /**
   * Save What-If content to file system
   */
  async saveWhatIfContent(content: WhatIfContent): Promise<string> {
    try {
      await this.initializeTopicDirectory(content.topicId)
      
      const filename = this.generateFilename(content.id, content.createdAt)
      const filePath = this.getWhatIfFilePath(content.topicId, filename)
      
      // Prepare content for file
      const fileContent = this.formatContentForFile(content)
      
      // Write content to file
      await fs.writeFile(filePath, fileContent, 'utf-8')
      
      // Update metadata
      await this.updateMetadata(content.topicId, content, filename)
      
      logger.info('Saved What-If content', { 
        topicId: content.topicId, 
        filename, 
        wordCount: content.metadata.wordCount 
      })
      
      return filename
      
    } catch (error) {
      logger.error('Failed to save What-If content', { 
        topicId: content.topicId, 
        contentId: content.id, 
        error 
      })
      throw new Error(`Failed to save What-If content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Load What-If content from file system
   */
  async loadWhatIfContent(topicId: string, filename: string): Promise<WhatIfContent | null> {
    try {
      const filePath = this.getWhatIfFilePath(topicId, filename)
      const fileContent = await fs.readFile(filePath, 'utf-8')
      
      return this.parseContentFromFile(fileContent)
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.warn('What-If content file not found', { topicId, filename })
        return null
      }
      
      logger.error('Failed to load What-If content', { topicId, filename, error })
      throw new Error(`Failed to load What-If content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List all What-If scenarios for a topic
   */
  async listWhatIfScenarios(topicId: string): Promise<WhatIfMetadata> {
    try {
      const metadataPath = this.getMetadataPath(topicId)
      
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8')
        return JSON.parse(metadataContent)
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          // No metadata file exists yet, return empty metadata
          return {
            topicId,
            totalScenarios: 0,
            lastGenerated: '',
            scenarios: []
          }
        }
        throw error
      }
      
    } catch (error) {
      logger.error('Failed to list What-If scenarios', { topicId, error })
      throw new Error(`Failed to list scenarios: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a What-If scenario
   */
  async deleteWhatIfScenario(topicId: string, filename: string): Promise<boolean> {
    try {
      const filePath = this.getWhatIfFilePath(topicId, filename)
      
      // Delete the content file
      await fs.unlink(filePath)
      
      // Update metadata to remove the scenario
      await this.removeFromMetadata(topicId, filename)
      
      logger.info('Deleted What-If scenario', { topicId, filename })
      return true
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.warn('What-If scenario file not found for deletion', { topicId, filename })
        return false
      }
      
      logger.error('Failed to delete What-If scenario', { topicId, filename, error })
      throw new Error(`Failed to delete scenario: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get topic directory path
   */
  private getTopicPath(topicId: string): string {
    return join(this.basePath, topicId)
  }

  /**
   * Get What-If file path
   */
  private getWhatIfFilePath(topicId: string, filename: string): string {
    return join(this.getTopicPath(topicId), 'what-ifs', filename)
  }

  /**
   * Get metadata file path
   */
  private getMetadataPath(topicId: string): string {
    return join(this.getTopicPath(topicId), 'metadata.json')
  }

  /**
   * Generate filename for What-If content
   */
  private generateFilename(contentId: string, createdAt: string): string {
    const timestamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-')
    return `${timestamp}_${contentId}.md`
  }

  /**
   * Format content for file storage
   */
  private formatContentForFile(content: WhatIfContent): string {
    const frontMatter = `---
id: ${content.id}
topicId: ${content.topicId}
prompt: "${content.prompt.replace(/"/g, '\\"')}"
createdAt: ${content.createdAt}
metadata:
  wordCount: ${content.metadata.wordCount}
  characterCount: ${content.metadata.characterCount}
  model: ${content.metadata.model}
  temperature: ${content.metadata.temperature}
  contextChunks: ${content.metadata.contextChunks}
  processingTime: ${content.metadata.processingTime}
---

# What-If Scenario

**Prompt:** ${content.prompt}

**Generated:** ${new Date(content.createdAt).toLocaleString()}

---

${content.content}
`
    return frontMatter
  }

  /**
   * Parse content from file
   */
  private parseContentFromFile(fileContent: string): WhatIfContent {
    const frontMatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    
    if (!frontMatterMatch || !frontMatterMatch[1] || !frontMatterMatch[2]) {
      throw new Error('Invalid file format: missing front matter')
    }

    const frontMatter = frontMatterMatch[1]
    const content = frontMatterMatch[2].trim()
    
    // Extract content after the header section
    const contentMatch = content.match(/^.*?---\n\n([\s\S]*)$/)
    const actualContent = contentMatch && contentMatch[1] ? contentMatch[1].trim() : content

    // Parse front matter (simple YAML parsing for our specific format)
    const lines = frontMatter.split('\n')
    const parsed: any = {}
    
    let currentKey = ''
    let inMetadata = false
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      
      if (trimmed === 'metadata:') {
        inMetadata = true
        parsed.metadata = {}
        continue
      }
      
      if (inMetadata && trimmed.startsWith('  ')) {
        const [key, value] = trimmed.substring(2).split(': ')
        if (key && value !== undefined) {
          parsed.metadata = parsed.metadata || {}
          parsed.metadata[key] = isNaN(Number(value)) ? value : Number(value)
        }
      } else if (!inMetadata) {
        const [key, ...valueParts] = trimmed.split(': ')
        let value = valueParts.join(': ')
        
        // Remove quotes from string values
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/\\"/g, '"')
        }
        
        if (key) {
          parsed[key] = value
        }
      }
    }

    // Validate required fields
    if (!parsed.id || !parsed.topicId || !parsed.prompt || !parsed.createdAt) {
      throw new Error('Invalid file format: missing required fields')
    }

    return {
      id: parsed.id,
      topicId: parsed.topicId,
      prompt: parsed.prompt,
      content: actualContent,
      createdAt: parsed.createdAt,
      metadata: parsed.metadata || {
        wordCount: 0,
        characterCount: actualContent.length,
        model: 'unknown',
        temperature: 0.8,
        contextChunks: 0,
        processingTime: 0
      }
    }
  }

  /**
   * Update metadata file
   */
  private async updateMetadata(topicId: string, content: WhatIfContent, filename: string): Promise<void> {
    try {
      const metadata = await this.listWhatIfScenarios(topicId)
      
      // Add new scenario to metadata
      metadata.scenarios.push({
        id: content.id,
        filename,
        prompt: content.prompt,
        createdAt: content.createdAt,
        wordCount: content.metadata.wordCount
      })
      
      metadata.totalScenarios = metadata.scenarios.length
      metadata.lastGenerated = content.createdAt
      
      // Sort scenarios by creation date (newest first)
      metadata.scenarios.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      const metadataPath = this.getMetadataPath(topicId)
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
      
    } catch (error) {
      logger.error('Failed to update metadata', { topicId, error })
      // Don't throw here as the content was already saved successfully
    }
  }

  /**
   * Remove scenario from metadata
   */
  private async removeFromMetadata(topicId: string, filename: string): Promise<void> {
    try {
      const metadata = await this.listWhatIfScenarios(topicId)
      
      metadata.scenarios = metadata.scenarios.filter(s => s.filename !== filename)
      metadata.totalScenarios = metadata.scenarios.length
      
      if (metadata.scenarios.length > 0) {
        metadata.lastGenerated = metadata.scenarios[0]?.createdAt || ''
      } else {
        metadata.lastGenerated = ''
      }
      
      const metadataPath = this.getMetadataPath(topicId)
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
      
    } catch (error) {
      logger.error('Failed to remove from metadata', { topicId, filename, error })
      // Don't throw here as the file was already deleted successfully
    }
  }
}

// Export singleton instance
export const fileSystemManager = new FileSystemManager()
