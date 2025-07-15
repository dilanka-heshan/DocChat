import { supabase } from "./supabase"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://13.48.43.175:8000"

// Types
interface APIResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

interface DocumentUploadRequest {
  file_path: string
  document_id: string
  user_id: string
}

interface QuestionRequest {
  question: string
  document_ids: string[]
  user_id: string
}

interface SourceChunk {
  document_id: string
  document_name: string
  chunk_text: string
  score: number
}

interface QuestionResponse {
  answer: string
  sources: SourceChunk[]
  question: string
}

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

// Helper function to make authenticated API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  try {
    const token = await getAuthToken()
    
    if (!token) {
      throw new Error("No authentication token available")
    }

    const url = `${BACKEND_URL}${endpoint}`
    console.log(`Making API call to: ${url}`)

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...options.headers,
      },
    })

    console.log(`API response status: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`API error for ${endpoint}:`, errorData)
      throw new Error(errorData.message || errorData.detail || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log(`API success for ${endpoint}:`, data)
    return data
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    return {
      success: false,
      message: "API call failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Document Upload API
export async function processDocumentWithBackend(
  documentId: string,
  filePath: string,
  userId: string
): Promise<APIResponse> {
  const request: DocumentUploadRequest = {
    document_id: documentId,
    file_path: filePath,
    user_id: userId
  }

  return apiCall("/api/v1/upload_document", {
    method: "POST",
    body: JSON.stringify(request)
  })
}

// Question API
export async function askQuestionToBackend(
  question: string,
  documentIds: string[],
  userId: string
): Promise<APIResponse<QuestionResponse>> {
  const request: QuestionRequest = {
    question,
    document_ids: documentIds,
    user_id: userId
  }

  return apiCall<QuestionResponse>("/api/v1/ask_question", {
    method: "POST",
    body: JSON.stringify(request)
  })
}

// Quick question API
export async function askQuickQuestion(
  question: string
): Promise<APIResponse<QuestionResponse>> {
  return apiCall<QuestionResponse>(`/api/v1/ask_quick?question=${encodeURIComponent(question)}`, {
    method: "POST"
  })
}

// Document Management APIs
export async function getDocumentsFromBackend(
  statusFilter?: string,
  limit = 100,
  offset = 0
): Promise<APIResponse> {
  const params = new URLSearchParams()
  if (statusFilter) params.append("status_filter", statusFilter)
  params.append("limit", limit.toString())
  params.append("offset", offset.toString())

  return apiCall(`/api/v1/documents?${params.toString()}`)
}

export async function getDocumentFromBackend(documentId: string): Promise<APIResponse> {
  return apiCall(`/api/v1/documents/${documentId}`)
}

export async function deleteDocumentFromBackend(documentId: string): Promise<APIResponse> {
  return apiCall(`/api/v1/documents/${documentId}`, {
    method: "DELETE"
  })
}

export async function deleteMultipleDocumentsFromBackend(documentIds: string[]): Promise<APIResponse> {
  return apiCall("/api/v1/documents", {
    method: "DELETE",
    body: JSON.stringify(documentIds)
  })
}

export async function getDocumentStatsFromBackend(): Promise<APIResponse> {
  return apiCall("/api/v1/documents/stats")
}

// Health check
export async function checkBackendHealth(): Promise<APIResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`)
    return await response.json()
  } catch (error) {
    return {
      success: false,
      message: "Backend is not accessible",
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Manual cleanup trigger
export async function triggerManualCleanup(): Promise<APIResponse> {
  return apiCall("/api/v1/cleanup", {
    method: "POST"
  })
}
