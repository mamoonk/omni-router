import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'
import { encryptSecret, decryptSecret } from './crypto'
import { logFileModification, logApiKeySave } from './auditLogger'

const ENV_VARS = [
  'GEMINI_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY', 'COHERE_API_KEY',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'TOGETHER_API_KEY',
  'FIREWORKS_API_KEY', 'OPENROUTER_API_KEY', 'NVIDIA_API_KEY', 'PERPLEXITY_API_KEY',
  'XAI_API_KEY', 'EDEN_API_KEY', 'SILICONFLOW_API_KEY', 'HUGGINGFACE_API_KEY',
  'CLOUDFLARE_API_KEY', 'DASHSCOPE_API_KEY', 'AI21_API_KEY', 'CEREBRAS_API_KEY',
  'SAMBANOVA_API_KEY', 'DEEPINFRA_API_KEY', 'STABILITY_API_KEY', 'REPLICATE_API_KEY',
  'FALAI_API_KEY', 'VOLCENGINE_API_KEY', 'ZHIPU_API_KEY', 'BAIDU_API_KEY', 'MOONSHOT_API_KEY'
]

// Flag to enable/disable encryption (can be configured by user)
let encryptionEnabled = false

function getEnvPath(): string {
  return join(app.getPath('userData'), '.env')
}

/**
 * Check if encryption is enabled for local API keys
 */
export function isEncryptionEnabled(): boolean {
  return encryptionEnabled
}

/**
 * Enable or disable encryption for local API keys
 */
export function setEncryptionEnabled(enabled: boolean): void {
  encryptionEnabled = enabled
}

export function loadEnv(): void {
  const envPath = getEnvPath()
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    const parsed = dotenv.parse(content)
    
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) {
        // Try to decrypt if encryption is enabled and value looks encrypted
        if (encryptionEnabled && value.startsWith('enc:')) {
          try {
            const decrypted = decryptSecret(value.slice(4))
            process.env[key] = decrypted
          } catch (error) {
            console.error(`Failed to decrypt ${key}:`, error)
            process.env[key] = value
          }
        } else {
          process.env[key] = value
        }
      }
    }
  }
}

export function getApiKeyStatus(): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const key of ENV_VARS) {
    result[key] = Boolean(process.env[key])
  }
  return result
}

/**
 * Migrate existing plain text keys to encrypted format
 */
export function migrateToEncrypted(): void {
  const envPath = getEnvPath()
  if (!existsSync(envPath)) return
  
  const content = readFileSync(envPath, 'utf-8')
  const parsed = dotenv.parse(content)
  const needsMigration: Record<string, string> = {}
  
  // Find keys that aren't encrypted yet
  for (const [key, value] of Object.entries(parsed)) {
    if (ENV_VARS.includes(key) && !value.startsWith('enc:')) {
      needsMigration[key] = value
    }
  }
  
  if (Object.keys(needsMigration).length > 0) {
    // Encrypt and save
    const encryptedKeys: Record<string, string> = {}
    for (const [key, value] of Object.entries(needsMigration)) {
      encryptedKeys[key] = `enc:${encryptSecret(value)}`
    }
    
    // Save encrypted keys without logging (migration is internal)
    saveApiKeysDirect(encryptedKeys, false)
    
    logFileModification('local', envPath, 'ENCRYPT', true, `Migrated ${Object.keys(needsMigration).length} keys to encrypted format`)
  }
}

/**
 * Direct save without audit logging (used internally)
 */
function saveApiKeysDirect(keys: Record<string, string>, shouldLog = true): void {
  const envPath = getEnvPath()

  let existing = ''
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, 'utf-8')
  }

  const lines = existing.split('\n')
  const updatedLines: string[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      updatedLines.push(line)
      continue
    }
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) {
      updatedLines.push(line)
      continue
    }
    const key = trimmed.slice(0, eqIdx).trim()
    seen.add(key)

    if (keys[key] !== undefined) {
      if (keys[key]) {
        updatedLines.push(`${key}=${keys[key]}`)
      }
      delete keys[key]
    } else {
      updatedLines.push(line)
    }
  }

  for (const [key, value] of Object.entries(keys)) {
    if (value && !seen.has(key)) {
      updatedLines.push(`${key}=${value}`)
    }
  }

  writeFileSync(envPath, updatedLines.join('\n'), 'utf-8')

  // Update process.env
  for (const [key, value] of Object.entries(keys)) {
    if (value) {
      // Decrypt if encrypted before setting in env
      if (encryptionEnabled && value.startsWith('enc:')) {
        try {
          process.env[key] = decryptSecret(value.slice(4))
        } catch (error) {
          console.error(`Failed to decrypt ${key}:`, error)
          process.env[key] = value
        }
      } else {
        process.env[key] = value
      }
    }
  }
  
  if (shouldLog) {
    logFileModification('local', envPath, 'UPDATE', true, 'Saved API keys')
  }
}

export function saveApiKeys(keys: Record<string, string>): void {
  const envPath = getEnvPath()
  
  // Encrypt keys if encryption is enabled
  const keysToSave: Record<string, string> = {}
  for (const [key, value] of Object.entries(keys)) {
    if (value && encryptionEnabled) {
      // Store with enc: prefix to mark as encrypted
      keysToSave[key] = `enc:${encryptSecret(value)}`
    } else {
      keysToSave[key] = value
    }
  }

  // Use the direct save method which handles logging
  saveApiKeysDirect(keysToSave, true)
  
  // Log the save operation for each key
  for (const [key, value] of Object.entries(keys)) {
    if (value) {
      logApiKeySave('local', key, true, { encrypted: encryptionEnabled })
    }
  }
}
