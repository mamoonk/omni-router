import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import Database from 'better-sqlite3'

export type AuditEventType = 
  | 'API_KEY_ACCESS'
  | 'API_KEY_SAVE'
  | 'API_KEY_DELETE'
  | 'FILE_MODIFICATION'
  | 'AUTH_EVENT'
  | 'PROVIDER_CALL'
  | 'SETTINGS_CHANGE'
  | 'SECURITY_ALERT'

export interface AuditEvent {
  id?: number
  timestamp: string
  userId: string
  eventType: AuditEventType
  action: string
  resource?: string
  details?: string
  ipAddress?: string
  success: boolean
  metadata?: Record<string, any>
}

let db: Database.Database | null = null
let logFilePath: string | null = null

/**
 * Initialize the audit logger with both file and database storage
 */
export function initAuditLogger(dbInstance: Database.Database): void {
  db = dbInstance
  
  // Create audit_log table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip_address TEXT,
      success INTEGER NOT NULL,
      metadata TEXT
    )
  `)
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, timestamp)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(event_type)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)')
  
  // Setup file logging
  const userDataPath = app.getPath('userData')
  const logsDir = join(userDataPath, 'logs')
  
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true })
  }
  
  logFilePath = join(logsDir, 'audit.log')
}

/**
 * Log an audit event to both database and file
 */
export function logAuditEvent(event: Omit<AuditEvent, 'id'>): void {
  const timestamp = event.timestamp || new Date().toISOString()
  
  // Log to database if initialized
  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO audit_log (timestamp, user_id, event_type, action, resource, details, ip_address, success, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        timestamp,
        event.userId,
        event.eventType,
        event.action,
        event.resource || null,
        event.details || null,
        event.ipAddress || null,
        event.success ? 1 : 0,
        event.metadata ? JSON.stringify(event.metadata) : null
      )
    } catch (error) {
      console.error('Failed to write audit log to database:', error)
    }
  }
  
  // Log to file
  if (logFilePath) {
    try {
      const logEntry = JSON.stringify({
        timestamp,
        userId: event.userId,
        eventType: event.eventType,
        action: event.action,
        resource: event.resource,
        details: event.details,
        ipAddress: event.ipAddress,
        success: event.success,
        metadata: event.metadata
      })
      
      // Append to log file with newline
      const existingContent = existsSync(logFilePath) ? readFileSync(logFilePath, 'utf-8') : ''
      writeFileSync(logFilePath, existingContent + logEntry + '\n', 'utf-8')
    } catch (error) {
      console.error('Failed to write audit log to file:', error)
    }
  }
}

/**
 * Helper to log API key access events
 */
export function logApiKeyAccess(
  userId: string,
  provider: string,
  success: boolean,
  details?: string
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    eventType: 'API_KEY_ACCESS',
    action: 'READ',
    resource: `api_key:${provider}`,
    details,
    success
  })
}

/**
 * Helper to log API key save events
 */
export function logApiKeySave(
  userId: string,
  provider: string,
  success: boolean,
  metadata?: Record<string, any>
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    eventType: 'API_KEY_SAVE',
    action: 'SAVE',
    resource: `api_key:${provider}`,
    success,
    metadata
  })
}

/**
 * Helper to log authentication events
 */
export function logAuthEvent(
  userId: string,
  action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'MFA_ENABLE' | 'MFA_DISABLE',
  success: boolean,
  ipAddress?: string,
  details?: string
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    eventType: 'AUTH_EVENT',
    action,
    details,
    ipAddress,
    success
  })
}

/**
 * Helper to log provider API calls
 */
export function logProviderCall(
  userId: string,
  provider: string,
  model: string,
  success: boolean,
  metadata?: {
    tokensIn?: number
    tokensOut?: number
    latencyMs?: number
    cost?: number
  }
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    eventType: 'PROVIDER_CALL',
    action: 'API_CALL',
    resource: `provider:${provider}:${model}`,
    success,
    metadata
  })
}

/**
 * Helper to log file modifications
 */
export function logFileModification(
  userId: string,
  filePath: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ENCRYPT' | 'DECRYPT',
  success: boolean,
  details?: string
): void {
  logAuditEvent({
    timestamp: new Date().toISOString(),
    userId,
    eventType: 'FILE_MODIFICATION',
    action,
    resource: filePath,
    details,
    success
  })
}

/**
 * Retrieve audit logs for a user with optional filtering
 */
export function getAuditLogs(
  userId: string,
  options?: {
    startDate?: string
    endDate?: string
    eventType?: AuditEventType
    limit?: number
    offset?: number
  }
): AuditEvent[] {
  if (!db) {
    console.warn('Audit logger not initialized')
    return []
  }
  
  let query = 'SELECT * FROM audit_log WHERE user_id = ?'
  const params: any[] = [userId]
  
  if (options?.startDate) {
    query += ' AND timestamp >= ?'
    params.push(options.startDate)
  }
  
  if (options?.endDate) {
    query += ' AND timestamp <= ?'
    params.push(options.endDate)
  }
  
  if (options?.eventType) {
    query += ' AND event_type = ?'
    params.push(options.eventType)
  }
  
  query += ' ORDER BY timestamp DESC'
  
  const limit = options?.limit || 100
  query += ' LIMIT ?'
  params.push(limit)
  
  if (options?.offset) {
    query += ' OFFSET ?'
    params.push(options.offset)
  }
  
  const rows = db.prepare(query).all(...params) as any[]
  
  return rows.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id,
    eventType: row.event_type as AuditEventType,
    action: row.action,
    resource: row.resource,
    details: row.details,
    ipAddress: row.ip_address,
    success: row.success === 1,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }))
}

/**
 * Get audit statistics for a user
 */
export function getAuditStats(
  userId: string,
  days: number = 7
): {
  totalEvents: number
  eventsByType: Record<string, number>
  failedAttempts: number
  lastActivity: string | null
} {
  if (!db) {
    return { totalEvents: 0, eventsByType: {}, failedAttempts: 0, lastActivity: null }
  }
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  
  const totalRow = db.prepare(
    'SELECT COUNT(*) as count FROM audit_log WHERE user_id = ? AND timestamp >= ?'
  ).get(userId, startDate) as { count: number }
  
  const failedRow = db.prepare(
    'SELECT COUNT(*) as count FROM audit_log WHERE user_id = ? AND timestamp >= ? AND success = 0'
  ).get(userId, startDate) as { count: number }
  
  const lastRow = db.prepare(
    'SELECT timestamp FROM audit_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1'
  ).get(userId) as { timestamp: string } | undefined
  
  const typeRows = db.prepare(
    'SELECT event_type, COUNT(*) as count FROM audit_log WHERE user_id = ? AND timestamp >= ? GROUP BY event_type'
  ).all(userId, startDate) as Array<{ event_type: string; count: number }>
  
  const eventsByType: Record<string, number> = {}
  for (const row of typeRows) {
    eventsByType[row.event_type] = row.count
  }
  
  return {
    totalEvents: totalRow.count,
    eventsByType,
    failedAttempts: failedRow.count,
    lastActivity: lastRow?.timestamp || null
  }
}
