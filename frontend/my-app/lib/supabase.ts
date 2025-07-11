import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string
          name: string
          file_path: string
          file_type: string
          file_size: number
          status: "uploading" | "processing" | "completed" | "error"
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          file_path: string
          file_type: string
          file_size: number
          status?: "uploading" | "processing" | "completed" | "error"
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          file_path?: string
          file_type?: string
          file_size?: number
          status?: "uploading" | "processing" | "completed" | "error"
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          content: string
          role: "user" | "assistant"
          sources: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          content: string
          role: "user" | "assistant"
          sources?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          content?: string
          role?: "user" | "assistant"
          sources?: string[] | null
          created_at?: string
        }
      }
    }
  }
}
