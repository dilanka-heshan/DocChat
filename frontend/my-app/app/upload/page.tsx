"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, File, X, CheckCircle, AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import { useAuth } from "@/lib/auth-context"
import { createDocument, updateDocument, getUserDocuments } from "@/lib/database"
import { uploadFile as uploadToStorage } from "@/lib/storage"
import { processDocumentWithBackend } from "@/lib/api"

interface UploadFile {
  id: string
  file: File
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  error?: string
  documentId?: string
  fileName: string
  fileSize: number
}

// Key for localStorage
const UPLOAD_SESSION_KEY = 'docChat_upload_session'
const ACTIVE_UPLOADS_KEY = 'docChat_active_uploads'

interface UploadSession {
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

export default function UploadPage() {
  const { user } = useAuth()
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [hasRecoveredSession, setHasRecoveredSession] = useState(false)
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Generate or recover session ID
  useEffect(() => {
    if (user?.id) {
      const existingSession = localStorage.getItem(UPLOAD_SESSION_KEY)
      if (existingSession) {
        try {
          const session: UploadSession = JSON.parse(existingSession)
          if (session.userId === user.id && Date.now() - session.timestamp < 30 * 60 * 1000) { // 30 minutes
            setSessionId(session.sessionId)
            setShowRecoveryBanner(true)
            return
          }
        } catch (e) {
          console.error('Failed to parse existing session:', e)
        }
      }
      
      // Create new session
      const newSessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
    }
  }, [user?.id])

  // Save upload session to localStorage
  const saveUploadSession = useCallback((files: UploadFile[]) => {
    if (!user?.id || !sessionId) return
    
    const session: UploadSession = {
      sessionId,
      userId: user.id,
      files: files.map(f => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize,
        status: f.status,
        documentId: f.documentId,
        progress: f.progress,
        error: f.error
      })),
      timestamp: Date.now()
    }
    
    localStorage.setItem(UPLOAD_SESSION_KEY, JSON.stringify(session))
    localStorage.setItem(ACTIVE_UPLOADS_KEY, files.some(f => f.status === 'uploading' || f.status === 'processing') ? 'true' : 'false')
  }, [user?.id, sessionId])

  // Recover upload session
  const recoverUploadSession = useCallback(async () => {
    if (!user?.id || !sessionId || hasRecoveredSession) return
    
    const existingSession = localStorage.getItem(UPLOAD_SESSION_KEY)
    if (!existingSession) return
    
    try {
      const session: UploadSession = JSON.parse(existingSession)
      if (session.sessionId !== sessionId || session.userId !== user.id) return
      
      console.log('Recovering upload session:', session)
      
      // Check for any incomplete uploads and their current status in database
      const { data: userDocs } = await getUserDocuments(user.id)
      const docMap = new Map(userDocs?.map(doc => [doc.id, doc]) || [])
      
      const recoveredFiles: UploadFile[] = []
      
      for (const fileData of session.files) {
        // Check if document exists and get current status
        const doc = fileData.documentId ? docMap.get(fileData.documentId) : null
        
        // Create placeholder file object for recovered sessions
        const placeholderFile = {
          name: fileData.fileName,
          size: fileData.fileSize,
          type: getFileType(fileData.fileName),
          lastModified: Date.now(),
          arrayBuffer: async () => new ArrayBuffer(0),
          slice: () => new Blob([]),
          stream: () => new ReadableStream(),
          text: async () => '',
        } as File

        const recoveredFile: UploadFile = {
          id: fileData.id,
          file: placeholderFile,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          progress: doc ? 100 : fileData.progress,
          status: doc ? (doc.status as any) : fileData.status,
          error: doc?.error_message || fileData.error,
          documentId: fileData.documentId
        }
        
        recoveredFiles.push(recoveredFile)
      }
      
      setUploadFiles(recoveredFiles)
      setHasRecoveredSession(true)
      
      // Check if any uploads are still in progress
      const hasActiveUploads = recoveredFiles.some(f => f.status === 'uploading' || f.status === 'processing')
      setIsUploading(hasActiveUploads)
      
      if (hasActiveUploads) {
        // Start monitoring for completion
        startUploadMonitoring()
      }
      
    } catch (e) {
      console.error('Failed to recover upload session:', e)
    }
  }, [user?.id, sessionId, hasRecoveredSession])

  // Get file type from extension
  const getFileType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf': return 'application/pdf'
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case 'txt': return 'text/plain'
      default: return 'application/octet-stream'
    }
  }

  // Monitor uploads for completion
  const startUploadMonitoring = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    intervalRef.current = setInterval(async () => {
      if (!user?.id) return
      
      try {
        const { data: userDocs } = await getUserDocuments(user.id)
        if (!userDocs) return
        
        const docMap = new Map(userDocs.map(doc => [doc.id, doc]))
        let hasChanges = false
        let hasActiveUploads = false
        
        setUploadFiles(prev => prev.map(file => {
          if (!file.documentId) return file
          
          const doc = docMap.get(file.documentId)
          if (!doc) return file
          
          const newStatus = doc.status as any
          if (newStatus !== file.status) {
            hasChanges = true
            return {
              ...file,
              status: newStatus,
              progress: newStatus === 'completed' ? 100 : file.progress,
              error: doc.error_message || undefined
            }
          }
          
          if (file.status === 'uploading' || file.status === 'processing') {
            hasActiveUploads = true
          }
          
          return file
        }))
        
        if (!hasActiveUploads) {
          setIsUploading(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          localStorage.removeItem(ACTIVE_UPLOADS_KEY)
        }
        
      } catch (e) {
        console.error('Error monitoring uploads:', e)
      }
    }, 2000) // Check every 2 seconds
  }, [user?.id])

  // Recover session on mount
  useEffect(() => {
    if (sessionId && user?.id) {
      recoverUploadSession()
    }
  }, [sessionId, user?.id, recoverUploadSession])

  // Save session whenever uploadFiles changes
  useEffect(() => {
    if (uploadFiles.length > 0) {
      saveUploadSession(uploadFiles)
    }
  }, [uploadFiles, saveUploadSession])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user || isUploading) return

      setIsUploading(true)
      const newFiles = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        status: "uploading" as const,
      }))

      setUploadFiles((prev) => [...prev, ...newFiles])

      // Start monitoring
      startUploadMonitoring()

      // Process each file
      for (const uploadFile of newFiles) {
        await processFile(uploadFile)
      }
    },
    [user, isUploading, startUploadMonitoring],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  })

  // Prevent navigation during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    // Mobile-specific: prevent page refresh/navigation
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isUploading) {
        // Save current state before page might be killed
        saveUploadSession(uploadFiles)
      }
    }

    // Mobile-specific: handle page freeze/unfreeze
    const handlePageFreeze = () => {
      if (isUploading) {
        saveUploadSession(uploadFiles)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('freeze', handlePageFreeze)
    window.addEventListener('pagehide', handlePageFreeze)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('freeze', handlePageFreeze)
      window.removeEventListener('pagehide', handlePageFreeze)
    }
  }, [isUploading, uploadFiles, saveUploadSession])

  const processFile = async (uploadFile: UploadFile) => {
    if (!user) return

    try {
      // Update progress
      const updateProgress = (progress: number) => {
        setUploadFiles((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, progress } : f)))
      }

      // Create document record
      const { data: document, error: dbError } = await createDocument({
        user_id: user.id,
        name: uploadFile.file.name,
        file_path: "", // Will be updated after upload
        file_type: uploadFile.file.name.split(".").pop()?.toUpperCase() || "UNKNOWN",
        file_size: uploadFile.file.size,
        status: "uploading",
      })

      if (dbError || !document) {
        throw new Error(dbError || "Failed to create document record")
      }

      // Update file with document ID
      setUploadFiles((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, documentId: document.id } : f)))

      // Simulate upload progress
      for (let i = 10; i <= 90; i += 10) {
        updateProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      // Upload to Supabase Storage
      console.log(`Starting Supabase Storage upload for file: ${uploadFile.file.name}`)
      const { path, error: uploadError } = await uploadToStorage(uploadFile.file, user.id)

      if (uploadError || !path) {
        console.error("Supabase Storage upload failed:", uploadError)
        throw new Error(uploadError || "Failed to upload file to storage")
      }

      console.log(`File uploaded successfully to storage: ${path}`)
      updateProgress(100)

      // Update document with file path and set to processing
      await updateDocument(document.id, {
        file_path: path,
        status: "processing",
      })

      setUploadFiles((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "processing" } : f)))

      // Process document with backend RAG pipeline
      console.log(`Starting backend processing for document: ${document.id}`)
      const processResult = await processDocumentWithBackend(document.id, path, user.id)

      if (processResult.success) {
        // Backend processing successful
        console.log(`Backend processing completed for document: ${document.id}`)
        await updateDocument(document.id, { status: "completed" })
        setUploadFiles((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "completed" } : f)))
      } else {
        // Backend processing failed
        console.error(`Backend processing failed for document: ${document.id}`, processResult.error)
        const errorMessage = processResult.error || "Failed to process document with RAG backend"
        await updateDocument(document.id, {
          status: "error",
          error_message: errorMessage,
        })
        setUploadFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "error", error: errorMessage } : f)),
        )
      }
    } catch (error) {
      console.error("Error processing file:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      setUploadFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "error", error: errorMessage } : f)),
      )

      // Update document status if we have the ID
      if (uploadFile.documentId) {
        await updateDocument(uploadFile.documentId, {
          status: "error",
          error_message: errorMessage,
        })
      }
    }
  }

  const removeFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const clearCompletedUploads = () => {
    setUploadFiles((prev) => prev.filter((file) => file.status !== "completed"))
  }

  const clearAllUploads = () => {
    setUploadFiles([])
    localStorage.removeItem(UPLOAD_SESSION_KEY)
    localStorage.removeItem(ACTIVE_UPLOADS_KEY)
    setShowRecoveryBanner(false)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />
      case "docx":
        return <File className="w-5 h-5 text-blue-500" />
      case "txt":
        return <File className="w-5 h-5 text-gray-500" />
      default:
        return <File className="w-5 h-5" />
    }
  }

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case "uploading":
        return `Uploading... ${file.progress}%`
      case "processing":
        return "Processing document..."
      case "completed":
        return "Ready for questions"
      case "error":
        return file.error || "Upload failed"
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to upload documents</h1>
          <Link href="/auth/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!isUploading ? (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="sm" disabled className="opacity-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
            <h1 className="text-2xl font-bold">Upload Documents</h1>
          </div>
          <span className="text-sm text-gray-500 hidden sm:inline">Signed in as {user.email}</span>
        </div>
      </header>

      {/* Recovery Banner */}
      {showRecoveryBanner && (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
          <div className="max-w-4xl mx-auto p-4">
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  We detected that your upload session was interrupted. Your uploads have been recovered and are being monitored for completion.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRecoveryBanner(false)
                    localStorage.removeItem(UPLOAD_SESSION_KEY)
                  }}
                  className="ml-4 flex-shrink-0"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Upload Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Documents</CardTitle>
            <CardDescription>
              Upload PDF, DOCX, or TXT files to start asking questions. Maximum file size: 10MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-base sm:text-lg text-blue-600">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-base sm:text-lg mb-2">Drag & drop files here, or click to select</p>
                  <p className="text-sm text-gray-500">Supports PDF, DOCX, and TXT files up to 10MB</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Upload Progress
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                {uploadFiles.filter((f) => f.status === "completed").length} of {uploadFiles.length} files processed
                {isUploading && " - Upload in progress"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getFileIcon(uploadFile.fileName)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{uploadFile.fileName}</p>
                          <p className="text-sm text-gray-500">{(uploadFile.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                          {hasRecoveredSession && uploadFile.documentId && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">Recovered from previous session</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {getStatusIcon(uploadFile.status)}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={uploadFile.status === "uploading" || uploadFile.status === "processing"}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{getStatusText(uploadFile)}</span>
                        <Badge
                          variant={
                            uploadFile.status === "completed"
                              ? "default"
                              : uploadFile.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {uploadFile.status}
                        </Badge>
                      </div>

                      {(uploadFile.status === "uploading" || uploadFile.status === "processing") && (
                        <Progress value={uploadFile.status === "uploading" ? uploadFile.progress : 100} />
                      )}

                      {uploadFile.status === "error" && uploadFile.error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{uploadFile.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t space-y-3">
                {uploadFiles.some((f) => f.status === "completed") && !isUploading && (
                  <div>
                    <Link href="/dashboard">
                      <Button className="w-full sm:w-auto">
                        Start Asking Questions
                        <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                      </Button>
                    </Link>
                  </div>
                )}
                
                {isUploading && (
                  <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <div className="text-center">
                      <p className="text-blue-700 dark:text-blue-300 font-medium">
                        Upload in progress...
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Please keep this tab open. Your progress will be saved if interrupted.
                      </p>
                    </div>
                  </div>
                )}

                {/* Management buttons */}
                {uploadFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadFiles.some((f) => f.status === "completed") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearCompletedUploads}
                        disabled={isUploading}
                      >
                        Clear Completed
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllUploads}
                      disabled={isUploading}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Supported File Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">PDF Files</p>
                  <p className="text-sm text-gray-500">Research papers, reports, manuals</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <File className="w-8 h-8 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Word Documents</p>
                  <p className="text-sm text-gray-500">DOCX format documents</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <File className="w-8 h-8 text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Text Files</p>
                  <p className="text-sm text-gray-500">Plain text documents</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
