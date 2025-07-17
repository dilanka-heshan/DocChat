// Upload Recovery Utility Functions
// These functions help manage upload sessions for mobile reliability

export const UPLOAD_SESSION_KEY = 'docChat_upload_session'
export const ACTIVE_UPLOADS_KEY = 'docChat_active_uploads'

export interface UploadSession {
  sessionId: string
  userId: string
  files: {
    id: string
    fileName: string
    fileSize: number
    status: string
    documentId?: string
    progress: number
    error?: string
  }[]
  timestamp: number
}

export function hasActiveUploadSession(): boolean {
  try {
    const activeUploads = localStorage.getItem(ACTIVE_UPLOADS_KEY)
    return activeUploads === 'true'
  } catch {
    return false
  }
}

export function getUploadSession(): UploadSession | null {
  try {
    const session = localStorage.getItem(UPLOAD_SESSION_KEY)
    return session ? JSON.parse(session) : null
  } catch {
    return null
  }
}

export function clearUploadSession(): void {
  try {
    localStorage.removeItem(UPLOAD_SESSION_KEY)
    localStorage.removeItem(ACTIVE_UPLOADS_KEY)
  } catch {
    // Ignore errors in case localStorage is not available
  }
}

export function isSessionExpired(session: UploadSession, maxAgeMs: number = 30 * 60 * 1000): boolean {
  return Date.now() - session.timestamp > maxAgeMs
}
