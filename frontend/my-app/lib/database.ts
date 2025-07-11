import { supabase } from "./supabase"
import type { Database } from "./supabase"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"]
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"]

type Message = Database["public"]["Tables"]["messages"]["Row"]
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"]

type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"]
type ChatSessionInsert = Database["public"]["Tables"]["chat_sessions"]["Insert"]

// Document operations
export async function createDocument(document: DocumentInsert): Promise<{ data?: Document; error?: string }> {
  try {
    const { data, error } = await supabase.from("documents").insert(document).select().single()

    if (error) throw error
    return { data }
  } catch (error) {
    console.error("Error creating document:", error)
    return { error: "Failed to create document" }
  }
}

export async function getUserDocuments(userId: string): Promise<{ data?: Document[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return { data }
  } catch (error) {
    console.error("Error fetching documents:", error)
    return { error: "Failed to fetch documents" }
  }
}

export async function updateDocument(
  id: string,
  updates: DocumentUpdate,
): Promise<{ data?: Document; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("documents")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return { data }
  } catch (error) {
    console.error("Error updating document:", error)
    return { error: "Failed to update document" }
  }
}

export async function deleteDocument(id: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from("documents").delete().eq("id", id)

    if (error) throw error
    return {}
  } catch (error) {
    console.error("Error deleting document:", error)
    return { error: "Failed to delete document" }
  }
}

// Chat session operations
export async function createChatSession(session: ChatSessionInsert): Promise<{ data?: ChatSession; error?: string }> {
  try {
    const { data, error } = await supabase.from("chat_sessions").insert(session).select().single()

    if (error) throw error
    return { data }
  } catch (error) {
    console.error("Error creating chat session:", error)
    return { error: "Failed to create chat session" }
  }
}

export async function getUserChatSessions(userId: string): Promise<{ data?: ChatSession[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (error) throw error
    return { data }
  } catch (error) {
    console.error("Error fetching chat sessions:", error)
    return { error: "Failed to fetch chat sessions" }
  }
}

// Message operations
export async function createMessage(message: MessageInsert): Promise<{ data?: Message; error?: string }> {
  try {
    const { data, error } = await supabase.from("messages").insert(message).select().single()

    if (error) throw error
    return { data }
  } catch (error) {
    console.error("Error creating message:", error)
    return { error: "Failed to create message" }
  }
}

export async function getSessionMessages(sessionId: string): Promise<{ data?: Message[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return { data }
  } catch (error) {
    console.error("Error fetching messages:", error)
    return { error: "Failed to fetch messages" }
  }
}

// User statistics
export async function getUserStats(userId: string): Promise<{
  documentsCount: number
  messagesCount: number
  storageUsed: number
}> {
  try {
    const [documentsResult, messagesResult] = await Promise.all([
      supabase.from("documents").select("file_size").eq("user_id", userId),
      supabase.from("messages").select("id", { count: "exact" }).eq("user_id", userId),
    ])

    const documentsCount = documentsResult.data?.length || 0
    const messagesCount = messagesResult.count || 0
    const storageUsed = documentsResult.data?.reduce((total, doc) => total + (doc.file_size || 0), 0) || 0

    return {
      documentsCount,
      messagesCount,
      storageUsed: storageUsed / (1024 * 1024), // Convert to MB
    }
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return { documentsCount: 0, messagesCount: 0, storageUsed: 0 }
  }
}
