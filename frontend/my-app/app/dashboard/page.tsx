"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Trash2, Send, User, Bot, Plus, Settings, LogOut, Menu, X, AlertCircle, CheckSquare, Square, UserCircle } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { getUserDocuments, createChatSession, createMessage } from "@/lib/database"
import { askQuestionToBackend, getDocumentsFromBackend, deleteDocumentFromBackend, deleteMultipleDocumentsFromBackend } from "@/lib/api"
import type { Database } from "@/lib/supabase"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type Message = Database["public"]["Tables"]["messages"]["Row"]

export default function Dashboard() {
  console.log('Dashboard component rendered/re-rendered')
  const { user, signOut, loading: authLoading } = useAuth()
  console.log('Dashboard: auth state:', { user: !!user, authLoading })
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [documentsLoading, setDocumentsLoading] = useState(true)

  const loadDocuments = useCallback(async () => {
    if (!user?.id) return

    console.log('Loading documents for user:', user.id)
    setDocumentsLoading(true)
    const { data, error } = await getUserDocuments(user.id)

    console.log('Documents loaded:', { data: data?.length, error })
    if (error) {
      console.error('Error loading documents:', error)
      setError(error)
    } else {
      setDocuments(data || [])
    }
    setDocumentsLoading(false)
  }, [user?.id])

  const initializeChatSession = useCallback(async () => {
    if (!user?.id || currentSessionId) return // Don't reinitialize if session already exists

    console.log('Initializing chat session for user:', user.id)
    try {
      const { data: session } = await createChatSession({
        user_id: user.id,
        title: "New Chat Session",
      })

      console.log('Chat session created:', { session: !!session, sessionId: session?.id })
      if (session) {
        setCurrentSessionId(session.id)

        // Add welcome message
        const welcomeMessage = {
          session_id: session.id,
          user_id: user.id,
          content:
            "Hello! I'm ready to help you with questions about your uploaded documents. What would you like to know?",
          role: "assistant" as const,
        }

        const { data: message } = await createMessage(welcomeMessage)
        console.log('Welcome message created:', { message: !!message })
        if (message) {
          setMessages([message])
        }
      }
    } catch (error) {
      console.error('Error initializing chat session:', error)
      setError("Failed to initialize chat session")
    }
  }, [user?.id, currentSessionId])

  // Load user documents
  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { user: !!user, userId: user?.id })
    if (user?.id) {
      console.log('Loading documents and initializing chat session...')
      loadDocuments()
      initializeChatSession()
    }
  }, [user?.id]) // Only depend on user.id to prevent infinite loops

  const handleSendQuestion = async () => {
    if (!question.trim() || !user || !currentSessionId) return

    const userMessage = {
      session_id: currentSessionId,
      user_id: user.id,
      content: question,
      role: "user" as const,
    }

    // Add user message to UI immediately
    const { data: userMsg } = await createMessage(userMessage)
    if (userMsg) {
      setMessages((prev) => [...prev, userMsg])
    }

    const currentQuestion = question
    setQuestion("")
    setIsLoading(true)

    try {
      // Get completed documents for the query
      const completedDocs = selectedDocuments.length > 0 
        ? selectedDocuments.filter(docId => {
            const doc = documents.find(d => d.id === docId)
            return doc && doc.status === 'completed'
          })
        : documents.filter(doc => doc.status === 'completed').map(doc => doc.id)

      if (completedDocs.length === 0) {
        const errorMsg = selectedDocuments.length > 0 
          ? "None of the selected documents are ready for querying. Please ensure documents have been processed successfully."
          : "No completed documents available for querying. Please upload and process documents first."
        throw new Error(errorMsg)
      }

      // Call backend API
      const response = await askQuestionToBackend(currentQuestion, completedDocs, user.id)

      if (response.success && response.data) {
        const assistantMessage = {
          session_id: currentSessionId,
          user_id: user.id,
          content: response.data.answer,
          role: "assistant" as const,
          sources: response.data.sources.map(source => `${source.document_name} (Score: ${source.score.toFixed(2)})`),
        }

        const { data: assistantMsg } = await createMessage(assistantMessage)
        if (assistantMsg) {
          setMessages((prev) => [...prev, assistantMsg])
        }
      } else {
        throw new Error(response.error || "Failed to get answer from backend")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      
      // Add error message to chat
      const errorMessage = {
        session_id: currentSessionId,
        user_id: user.id,
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: "assistant" as const,
      }

      const { data: errorMsg } = await createMessage(errorMessage)
      if (errorMsg) {
        setMessages((prev) => [...prev, errorMsg])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDocument = async (document: Document) => {
    try {
      // Use backend API to delete document completely (Qdrant vectors, Supabase storage, and database)
      const result = await deleteDocumentFromBackend(document.id)

      if (result.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== document.id))
        // Remove from selected documents if it was selected
        setSelectedDocuments((prev) => prev.filter((id) => id !== document.id))
        setError(null) // Clear any previous errors
      } else {
        setError(result.error || "Failed to delete document")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      setError("Failed to delete document")
    }
  }

  const handleDeleteSelectedDocuments = async () => {
    if (selectedDocuments.length === 0) return
    
    try {
      // Use backend API to delete multiple documents completely (Qdrant vectors, Supabase storage, and database)
      const result = await deleteMultipleDocumentsFromBackend(selectedDocuments)

      if (result.success) {
        // Remove deleted documents from state
        setDocuments((prev) => prev.filter((doc) => !selectedDocuments.includes(doc.id)))
        // Clear selection
        setSelectedDocuments([])
        setError(null) // Clear any previous errors
      } else {
        setError(result.error || "Failed to delete selected documents")
      }
    } catch (error) {
      console.error("Error deleting selected documents:", error)
      setError("Failed to delete selected documents")
    }
  }

  const handleDocumentSelection = (documentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocuments((prev) => [...prev, documentId])
    } else {
      setSelectedDocuments((prev) => prev.filter((id) => id !== documentId))
    }
  }

  const handleSelectAllDocuments = () => {
    const completedDocIds = documents.filter(doc => doc.status === 'completed').map(doc => doc.id)
    setSelectedDocuments(completedDocIds)
  }

  const handleClearSelection = () => {
    setSelectedDocuments([])
  }

  const getSelectedDocumentsInfo = () => {
    const completedDocs = documents.filter(doc => doc.status === 'completed')
    const selectedCompletedDocs = selectedDocuments.filter(id => 
      completedDocs.some(doc => doc.id === id)
    )
    
    return {
      total: completedDocs.length,
      selected: selectedCompletedDocs.length,
      allSelected: selectedCompletedDocs.length === completedDocs.length && completedDocs.length > 0,
      noneSelected: selectedCompletedDocs.length === 0
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  if (authLoading) {
    console.log('Dashboard: Showing loading screen - authLoading is true')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    console.log('Dashboard: Showing login redirect - no user found')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to continue</h1>
          <Link href="/auth/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  console.log('Dashboard: Rendering main dashboard interface', { user: !!user, authLoading })

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b flex-shrink-0">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold">DocChat</span>
          </Link>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <Link href="/upload">
            <Button className="w-full mb-4">
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </Link>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Your Documents ({documents.length})
                </h3>
                {documents.filter(doc => doc.status === 'completed').length > 0 && (
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllDocuments}
                      className="text-xs px-2 py-1 h-6"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="text-xs px-2 py-1 h-6"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      None
                    </Button>
                    {selectedDocuments.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelectedDocuments}
                        className="text-xs px-2 py-1 h-6"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete ({selectedDocuments.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {(() => {
                const selectionInfo = getSelectedDocumentsInfo()
                return selectionInfo.total > 0 && (
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {selectionInfo.noneSelected 
                        ? `All ${selectionInfo.total} completed documents will be used`
                        : `${selectionInfo.selected} of ${selectionInfo.total} documents selected`
                      }
                    </p>
                  </div>
                )
              })()}

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {documentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : documents.length === 0 ? (
                  <Card className="p-4 text-center">
                    <p className="text-sm text-gray-500">No documents uploaded yet</p>
                    <Link href="/upload">
                      <Button variant="link" size="sm">
                        Upload your first document
                      </Button>
                    </Link>
                  </Card>
                ) : (
                  documents.map((doc) => (
                    <Card key={doc.id} className={`p-3 ${selectedDocuments.includes(doc.id) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
                      <div className="flex items-start space-x-3">
                        {/* Document Selection Checkbox */}
                        <div className="flex-shrink-0 mt-1">
                          <Checkbox
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={(checked) => handleDocumentSelection(doc.id, checked as boolean)}
                            disabled={doc.status !== 'completed'}
                            className="w-4 h-4"
                          />
                        </div>
                        
                        {/* Document Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge
                              variant={
                                doc.status === "completed"
                                  ? "default"
                                  : doc.status === "error"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {doc.status}
                            </Badge>
                            <span className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{getTimeAgo(doc.created_at)}</p>
                          {doc.status !== "completed" && (
                            <p className="text-xs text-orange-500 mt-1">
                              {doc.status === "processing"
                                ? "Processing..."
                                : doc.status === "error"
                                  ? "Error"
                                  : "Uploading..."}
                            </p>
                          )}
                        </div>
                        
                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons - Always Visible */}
        <div className="flex-shrink-0 p-4 border-t bg-white dark:bg-gray-800">
          <div className="space-y-2">
            {/* Profile Button */}
            <Link href="/profile">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <UserCircle className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </Link>
            
            {/* Settings and Theme Row */}
            <div className="flex items-center justify-between space-x-2">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="flex-1">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <ThemeToggle />
            </div>
            
            {/* Sign Out Button */}
            <Button variant="outline" size="sm" onClick={signOut} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{documents.length} documents</Badge>
              {(() => {
                const selectionInfo = getSelectedDocumentsInfo()
                return selectionInfo.total > 0 && !selectionInfo.noneSelected && (
                  <Badge variant="secondary">
                    {selectionInfo.selected} selected
                  </Badge>
                )
              })()}
              <span className="text-sm text-gray-500">Welcome, {user.email}</span>
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col pb-20">
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex-shrink-0 ${message.role === "user" ? "ml-3" : "mr-3"}`}>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === "user" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 border"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sources:</p>
                          {message.sources.map((source, index) => (
                            <Badge key={index} variant="outline" className="text-xs mr-1 mb-1">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex">
                    <div className="mr-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Bot className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t bg-white dark:bg-gray-800 p-4 sticky bottom-0 z-10">
            <div className="max-w-4xl mx-auto">
              {documents.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">Upload documents to start asking questions</p>
                  <Link href="/upload">
                    <Button>Upload Documents</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const selectionInfo = getSelectedDocumentsInfo()
                    if (selectionInfo.total === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-gray-500 mb-2">No completed documents available for querying</p>
                          <p className="text-sm text-gray-400">Please wait for documents to finish processing</p>
                        </div>
                      )
                    }

                    return (
                      <>
                        {/* Document Selection Info */}
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                          <span>
                            {selectionInfo.noneSelected 
                              ? `Querying all ${selectionInfo.total} completed documents`
                              : `Querying ${selectionInfo.selected} selected documents`
                            }
                          </span>
                          {!selectionInfo.noneSelected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearSelection}
                              className="text-xs px-2 py-1 h-6"
                            >
                              Use all documents
                            </Button>
                          )}
                        </div>

                        {/* Input Area */}
                        <div className="flex space-x-2">
                          <Textarea
                            placeholder="Ask a question about your documents..."
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="flex-1 min-h-[60px] resize-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSendQuestion()
                              }
                            }}
                          />
                          <Button onClick={handleSendQuestion} disabled={!question.trim() || isLoading} className="self-end">
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
