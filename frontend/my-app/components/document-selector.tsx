"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Filter, X, CheckSquare, Square, AlertCircle } from "lucide-react"
import type { Database } from "@/lib/supabase"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentSelectorProps {
  documents: Document[]
  selectedDocuments: string[]
  onSelectionChange: (documentIds: string[]) => void
  className?: string
}

export function DocumentSelector({ 
  documents, 
  selectedDocuments, 
  onSelectionChange,
  className = ""
}: DocumentSelectorProps) {
  const [showSelector, setShowSelector] = useState(false)

  const completedDocuments = documents.filter(doc => doc.status === 'completed')
  const selectedCount = selectedDocuments.filter(id => 
    completedDocuments.some(doc => doc.id === id)
  ).length

  const handleSelectAll = () => {
    onSelectionChange(completedDocuments.map(doc => doc.id))
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const handleDocumentToggle = (documentId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedDocuments, documentId])
    } else {
      onSelectionChange(selectedDocuments.filter(id => id !== documentId))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (completedDocuments.length === 0) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No completed documents available for querying. Please upload and process documents first.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Document Selection
            </CardTitle>
            <CardDescription>
              Choose specific documents to query, or leave empty to use all completed documents
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSelector(!showSelector)}
          >
            {showSelector ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Selection Summary */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm">
              {selectedCount === 0 ? (
                <span className="text-gray-600 dark:text-gray-300">
                  All {completedDocuments.length} completed documents will be used
                </span>
              ) : (
                <span className="text-blue-600 dark:text-blue-400">
                  {selectedCount} of {completedDocuments.length} documents selected
                </span>
              )}
            </div>
            {completedDocuments.length > 1 && (
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs px-2 py-1 h-6"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs px-2 py-1 h-6"
                >
                  <Square className="w-3 h-3 mr-1" />
                  None
                </Button>
              </div>
            )}
          </div>

          {/* Document List - Collapsible */}
          {showSelector && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {completedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedDocuments.includes(doc.id) 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedDocuments.includes(doc.id)}
                    onCheckedChange={(checked) => handleDocumentToggle(doc.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="default" className="text-xs">
                        {doc.file_type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-500">
                {selectedCount} document{selectedCount === 1 ? '' : 's'} will be queried
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs"
              >
                Use all documents
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
