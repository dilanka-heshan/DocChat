"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, File, X, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import { useAuth } from "@/lib/auth-context"
import { createDocument, updateDocument } from "@/lib/database"
import { uploadFile as uploadToStorage } from "@/lib/storage"
import { processDocumentWithBackend } from "@/lib/api"

interface UploadFile {
  id: string
  file: File
  progress: number
  status: "uploading" | "processing" | "completed" | "error"
  error?: string
  documentId?: string
}

export default function UploadPage() {
  const { user } = useAuth()
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) return

      const newFiles = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        progress: 0,
        status: "uploading" as const,
      }))

      setUploadFiles((prev) => [...prev, ...newFiles])

      // Process each file
      for (const uploadFile of newFiles) {
        await processFile(uploadFile)
      }
    },
    [user],
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
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Upload Documents</h1>
          </div>
          <span className="text-sm text-gray-500">Signed in as {user.email}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
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
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg text-blue-600">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
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
              <CardTitle>Upload Progress</CardTitle>
              <CardDescription>
                {uploadFiles.filter((f) => f.status === "completed").length} of {uploadFiles.length} files processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(uploadFile.file.name)}
                        <div>
                          <p className="font-medium">{uploadFile.file.name}</p>
                          <p className="text-sm text-gray-500">{(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(uploadFile.status)}
                        <Button variant="ghost" size="sm" onClick={() => removeFile(uploadFile.id)}>
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

              {uploadFiles.some((f) => f.status === "completed") && (
                <div className="mt-6 pt-4 border-t">
                  <Link href="/dashboard">
                    <Button>
                      Start Asking Questions
                      <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Supported File Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <FileText className="w-8 h-8 text-red-500" />
                <div>
                  <p className="font-medium">PDF Files</p>
                  <p className="text-sm text-gray-500">Research papers, reports, manuals</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <File className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">Word Documents</p>
                  <p className="text-sm text-gray-500">DOCX format documents</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <File className="w-8 h-8 text-gray-500" />
                <div>
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
