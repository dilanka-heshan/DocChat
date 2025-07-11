"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, TestTube } from "lucide-react"
import { checkStorageBucket, testStorageUpload } from "@/lib/storage"

export function StorageTester() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<{
    bucket: { exists: boolean; error?: string } | null
    upload: { success: boolean; message: string } | null
  }>({ bucket: null, upload: null })

  const runTests = async () => {
    setTesting(true)
    setResults({ bucket: null, upload: null })

    try {
      // Test 1: Check if bucket exists
      console.log("Testing storage bucket...")
      const bucketResult = await checkStorageBucket()
      setResults(prev => ({ ...prev, bucket: bucketResult }))

      if (bucketResult.exists) {
        // Test 2: Try uploading a file
        console.log("Testing file upload...")
        const uploadResult = await testStorageUpload()
        setResults(prev => ({ ...prev, upload: uploadResult }))
      }
    } catch (error) {
      console.error("Storage test error:", error)
      setResults(prev => ({ 
        ...prev, 
        upload: { 
          success: false, 
          message: error instanceof Error ? error.message : "Test failed" 
        }
      }))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Storage Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? "Testing..." : "Test Storage"}
        </Button>

        {results.bucket && (
          <Alert variant={results.bucket.exists ? "default" : "destructive"}>
            {results.bucket.exists ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <strong>Bucket Test:</strong> {
                results.bucket.exists 
                  ? "✅ Documents bucket exists" 
                  : `❌ ${results.bucket.error}`
              }
            </AlertDescription>
          </Alert>
        )}

        {results.upload && (
          <Alert variant={results.upload.success ? "default" : "destructive"}>
            {results.upload.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <strong>Upload Test:</strong> {
                results.upload.success 
                  ? "✅ File upload works" 
                  : `❌ ${results.upload.message}`
              }
            </AlertDescription>
          </Alert>
        )}

        {!results.bucket?.exists && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Required:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Go to Supabase Dashboard → Storage</li>
                <li>Create bucket named "documents"</li>
                <li>Set as Private (not public)</li>
                <li>Run the SQL script for policies</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
