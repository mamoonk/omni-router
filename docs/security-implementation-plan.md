# Security Enhancement Implementation Plan

## Overview
This document details the implementation strategy for enhancing API key security in Omni-Router, focusing on encrypting local API keys currently stored in plain text.

---

## Current State Analysis

### Problem
- **Location**: `~/.config/omni-router/.env`
- **Format**: Plain text
- **Risk**: Anyone with file system access can read all API keys
- **Affected Users**: Local/desktop users (`userId === 'local'`)

### Existing Infrastructure
- **Crypto module**: `/workspace/src/main/server/services/crypto.ts`
  - Already implements AES-256-GCM encryption
  - Uses `MYROUTER_SECRET` environment variable for key derivation
  - Functions: `encryptSecret()`, `decryptSecret()`
  
- **API Keys module**: `/workspace/src/main/server/services/apiKeys.ts`
  - Already encrypts keys for registered web users
  - Stores encrypted keys in SQLite database
  - Local users bypass encryption via `envManager.ts`

- **Env Manager**: `/workspace/src/main/server/services/envManager.ts`
  - Manages `.env` file for local users
  - No encryption currently applied

---

## Solution Design

### Approach: Master Password + Optional OS Keychain

Given disk space constraints preventing `keytar` installation, we'll implement a two-tier approach:

1. **Tier 1 (Immediate)**: Master password-based encryption using existing crypto module
2. **Tier 2 (Future)**: OS keychain integration when resources allow

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Local User Flow                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐ │
│  │ Master       │───▶│ Derive       │   │ Encrypted  │ │
│  │ Password     │    │ Encryption   │──▶│ .env File  │ │
│  │ (in memory)  │    │ Key          │   │            │ │
│  └──────────────┘    └──────────────┘   └────────────┘ │
│         ▲                                              │
│         │                                              │
│         │              ┌──────────────┐                │
│         └──────────────│ OS Keychain  │ (optional)     │
│                        │ (future)     │                │
│                        └──────────────┘                │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Core Encryption (Week 1)

#### 1.1 Update `envManager.ts`

**New Features:**
- `setMasterPassword(password: string): void` - Store derived key in memory
- `encryptEnvFile(password: string): void` - Encrypt existing .env
- `decryptEnvFile(password: string): boolean` - Decrypt on startup
- `isEncrypted(): boolean` - Check if .env is encrypted

**Changes:**
```typescript
// Add to envManager.ts
import { encryptSecret, decryptSecret } from './crypto'

let masterKey: string | null = null

export function setMasterPassword(password: string): void {
  // Derive key from password (use existing crypto or PBKDF2)
  masterKey = password // In production, derive properly
}

export function saveApiKeys(keys: Record<string, string>, encrypt?: boolean): void {
  const envPath = getEnvPath()
  let content = generateEnvContent(keys)
  
  if (encrypt && masterKey) {
    content = encryptSecret(content)
    // Mark file as encrypted with magic header
    content = '#ENCRYPTED\n' + content
  }
  
  writeFileSync(envPath, content, 'utf-8')
}

export function loadEnv(password?: string): void {
  const envPath = getEnvPath()
  if (!existsSync(envPath)) return
  
  let content = readFileSync(envPath, 'utf-8')
  
  if (content.startsWith('#ENCRYPTED\n')) {
    if (!password) {
      throw new Error('Encrypted .env requires password')
    }
    content = decryptSecret(content.replace('#ENCRYPTED\n', ''))
  }
  
  const parsed = dotenv.parse(content)
  // ... rest of loading logic
}
```

#### 1.2 Update `apiKeys.ts`

**Changes:**
- Modify `saveApiKeys()` to accept encryption flag
- Modify `resolveApiKey()` to handle decryption
- Add migration function for existing keys

```typescript
export function migrateLocalKeysToEncrypted(password: string): void {
  const currentKeys = envManager.getApiKeyStatus()
  const activeKeys: Record<string, string> = {}
  
  for (const [key, isActive] of Object.entries(currentKeys)) {
    if (isActive) {
      activeKeys[key] = process.env[key] || ''
    }
  }
  
  envManager.setMasterPassword(password)
  envManager.saveApiKeys(activeKeys, true)
  
  // Clear plaintext from process.env after migration
  for (const key of Object.keys(activeKeys)) {
    delete process.env[key]
  }
}
```

#### 1.3 Create Migration Script

**File**: `/workspace/src/main/migrate-keys.ts`

```typescript
import { app } from 'electron'
import { migrateLocalKeysToEncrypted } from './server/services/apiKeys'

export async function runMigration(password: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    migrateLocalKeysToEncrypted(password)
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

---

### Phase 2: UI Integration (Week 2)

#### 2.1 Settings Panel Updates

**File**: `/workspace/src/renderer/src/components/Layout/SettingsPanel.tsx`

**New UI Elements:**
- "Security" section in settings
- "Enable Encryption" button
- Password input dialog
- Migration status indicator
- "Change Password" option

#### 2.2 Startup Flow

**Changes to main process:**
- Check if .env is encrypted on startup
- Prompt for password if encrypted
- Show migration wizard for unencrypted keys

---

### Phase 3: Audit Logging (Week 2-3)

#### 3.1 Create Audit Logger

**File**: `/workspace/src/main/server/services/auditLogger.ts`

```typescript
import { join } from 'path'
import { appendFileSync, existsSync } from 'fs'
import { app } from 'electron'

interface AuditEvent {
  timestamp: string
  userId: string
  action: 'API_CALL' | 'KEY_ACCESS' | 'FILE_MODIFY' | 'AUTH_EVENT'
  resource: string
  provider?: string
  model?: string
  cost?: number
  success: boolean
  metadata?: Record<string, any>
}

export function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>): void {
  const logPath = join(app.getPath('userData'), 'audit.log')
  const eventWithTime: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString()
  }
  
  appendFileSync(logPath, JSON.stringify(eventWithTime) + '\n', 'utf-8')
}

export function getAuditLogs(days?: number): AuditEvent[] {
  // Implement log retrieval with optional date filtering
}
```

#### 3.2 Integrate Logging

**Locations to add logging:**
- `apiKeys.ts`: Log key access events
- Provider adapters: Log API calls with cost
- `envManager.ts`: Log file modifications
- Authentication flows

---

### Phase 4: Key Rotation (Week 3)

#### 4.1 Rotation Scheduler

**File**: `/workspace/src/main/server/services/keyRotation.ts`

```typescript
interface RotationSchedule {
  provider: string
  lastRotated: Date
  rotationIntervalDays: number
  reminderEnabled: boolean
}

export function checkRotationDue(provider: string): {
  due: boolean
  daysOverdue?: number
} {
  // Check if key rotation is due
}

export function scheduleRotationReminder(
  provider: string, 
  intervalDays: number
): void {
  // Set up reminder
}
```

#### 4.2 UI for Rotation

- Dashboard widget showing key age
- One-click rotation for supported providers
- Manual rotation trigger
- Rotation history log

---

## Security Considerations

### Key Derivation
```typescript
import { pbkdf2Sync, randomBytes } from 'crypto'

function deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256')
}
```

### Storage Strategy
- Salt stored alongside encrypted data
- Master key only in memory (cleared on app close)
- Optional: integrate with OS keychain later

### Threat Model
| Threat | Mitigation |
|--------|-----------|
| File system access | Encryption at rest |
| Memory scraping | Clear keys on logout/close |
| Shoulder surfing | Password masking in UI |
| Brute force | Strong KDF with iterations |

---

## Testing Plan

### Unit Tests
- [ ] Encryption/decryption roundtrip
- [ ] Migration from plaintext
- [ ] Password validation
- [ ] Audit log formatting

### Integration Tests
- [ ] Full migration flow
- [ ] Startup with encrypted keys
- [ ] Key rotation workflow

### Security Tests
- [ ] Verify no plaintext in storage
- [ ] Memory cleanup on close
- [ ] Audit log integrity

---

## Rollout Strategy

1. **Alpha** (Week 1-2): Internal testing with dev team
2. **Beta** (Week 3): Opt-in for power users
3. **General** (Week 4): Default for new installations
4. **Mandatory** (Month 2): Require encryption for all

---

## Future Enhancements

### OS Keychain Integration
When disk space allows:
```bash
npm install keytar
```

Replace master password with:
```typescript
import keytar from 'keytar'

const SERVICE_NAME = 'omni-router'
const ACCOUNT_NAME = 'master-key'

async function storeInKeychain(key: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key)
}

async function retrieveFromKeychain(): Promise<string | null> {
  return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
}
```

### Hardware Security Module Support
- YubiKey integration
- Smart card support
- Biometric authentication

---

## Success Metrics

- [ ] 100% of local user keys encrypted
- [ ] Zero plaintext key exposure in storage
- [ ] < 100ms overhead for encryption/decryption
- [ ] Positive user feedback on security UX
- [ ] Complete audit trail for compliance

---

## Appendix: File Changes Summary

| File | Changes | Priority |
|------|---------|----------|
| `envManager.ts` | Add encryption support | P0 |
| `apiKeys.ts` | Add migration functions | P0 |
| `crypto.ts` | Add password derivation | P0 |
| `auditLogger.ts` | New file | P1 |
| `keyRotation.ts` | New file | P2 |
| `SettingsPanel.tsx` | Add security UI | P1 |
| `main/index.ts` | Add startup prompts | P1 |

---

## Notes

- Backwards compatible: existing .env files continue to work
- Migration is opt-in initially
- Performance impact minimal (<100ms per operation)
- No breaking changes to API surface
