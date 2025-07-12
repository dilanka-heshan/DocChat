import { supabase } from "./supabase"

// Use the standard Supabase client for all storage operations

export async function uploadFile(file: File, userId: string): Promise<{ path?: string; error?: string }> {
  try {
    console.log(`Starting file upload for user ${userId}, file: ${file.name}, size: ${file.size}`)
    
    // Validate file
    if (!file) {
      throw new Error("No file provided")
    }
    
    if (file.size === 0) {
      throw new Error("File is empty")
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error("File size exceeds 10MB limit")
    }
    
    const fileExt = file.name.split(".").pop()?.toLowerCase()
    if (!fileExt || !['pdf', 'docx', 'txt'].includes(fileExt)) {
      throw new Error("Invalid file type. Only PDF, DOCX, and TXT files are allowed")
    }
    
    // Create unique filename - simplified for RLS compatibility
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${userId}_${timestamp}_${sanitizedFileName}`
    
    console.log(`Uploading to path: ${fileName}`)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      })

    if (error) {
      console.error("Supabase storage error:", error)
      throw new Error(`Upload failed: ${error.message}`)
    }
    
    if (!data || !data.path) {
      throw new Error("Upload completed but no path returned")
    }
    
    console.log(`File uploaded successfully to: ${data.path}`)
    return { path: data.path }
    
  } catch (error) {
    console.error("Error uploading file:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file"
    return { error: errorMessage }
  }
}

export async function deleteFile(path: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.storage.from("documents").remove([path])

    if (error) {
      throw error
    }

    return {}
  } catch (error) {
    console.error("Error deleting file:", error)
    return { error: "Failed to delete file" }
  }
}

export function getFileUrl(path: string): string {
  const { data } = supabase.storage.from("documents").getPublicUrl(path)

  return data.publicUrl
}

export async function checkStorageBucket(): Promise<{ exists: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    
    if (error) {
      throw error
    }
    
    const documentsBucket = data.find(bucket => bucket.name === "documents")
    
    if (!documentsBucket) {
      return { 
        exists: false, 
        error: "Documents bucket does not exist. Please create it in Supabase Storage." 
      }
    }
    
    console.log("Documents bucket exists:", documentsBucket)
    return { exists: true }
    
  } catch (error) {
    console.error("Error checking storage bucket:", error)
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : "Failed to check storage bucket" 
    }
  }
}

export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, expiresIn)
    
    if (error) {
      throw error
    }
    
    return { url: data.signedUrl }
  } catch (error) {
    console.error("Error creating signed URL:", error)
    return { error: error instanceof Error ? error.message : "Failed to create signed URL" }
  }
}

export async function testStorageUpload(): Promise<{ success: boolean; message: string }> {
  try {
    // Create a small test file
    const testContent = "This is a test file for storage validation"
    const testFile = new File([testContent], "test.txt", { type: "text/plain" })
    
    // Try to upload
    const result = await uploadFile(testFile, "test-user")
    
    if (result.error) {
      return { success: false, message: result.error }
    }
    
    // Try to delete the test file
    if (result.path) {
      await deleteFile(result.path)
    }
    
    return { success: true, message: "Storage test successful" }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Storage test failed" 
    }
  }
}
