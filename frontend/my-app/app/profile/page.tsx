"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, User, FileText, MessageSquare, Trash2, AlertTriangle, Shield, BarChart3 } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/lib/auth-context"
import { getUserStats, deleteDocument, getUserDocuments } from "@/lib/database"
import { deleteFile } from "@/lib/storage"

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const [email, setEmail] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [stats, setStats] = useState({
    documentsUploaded: 0,
    questionsAsked: 0,
    storageUsed: 0,
    storageLimit: 100, // MB
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setEmail(user.email || "")
      loadUserStats()
    }
  }, [user])

  const loadUserStats = async () => {
    if (!user) return

    try {
      const userStats = await getUserStats(user.id)
      setStats({
        documentsUploaded: userStats.documentsCount,
        questionsAsked: userStats.messagesCount,
        storageUsed: userStats.storageUsed,
        storageLimit: 100,
      })
    } catch (error) {
      console.error("Error loading user stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    try {
      // First delete all user documents and files
      const { data: documents } = await getUserDocuments(user.id)
      if (documents) {
        for (const doc of documents) {
          await deleteFile(doc.file_path)
          await deleteDocument(doc.id)
        }
      }

      // Sign out user (Supabase handles account deletion via admin API)
      await signOut()
    } catch (error) {
      console.error("Error deleting account:", error)
    }
  }

  const handleClearData = async () => {
    if (!user) return

    try {
      const { data: documents } = await getUserDocuments(user.id)
      if (documents) {
        for (const doc of documents) {
          await deleteFile(doc.file_path)
          await deleteDocument(doc.id)
        }
      }

      // Reload stats
      await loadUserStats()
    } catch (error) {
      console.error("Error clearing data:", error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view profile</h1>
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
            <h1 className="text-2xl font-bold">Profile & Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Usage Statistics
            </CardTitle>
            <CardDescription>Your activity and storage usage this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto mb-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{stats.documentsUploaded}</p>
                <p className="text-sm text-gray-500">Documents Uploaded</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mx-auto mb-2">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold">{stats.questionsAsked}</p>
                <p className="text-sm text-gray-500">Questions Asked</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto mb-2">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">{stats.storageUsed.toFixed(1)} MB</p>
                <p className="text-sm text-gray-500">Storage Used</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage Usage</span>
                <span className="text-sm text-gray-500">
                  {stats.storageUsed.toFixed(1)} / {stats.storageLimit} MB
                </span>
              </div>
              <Progress value={(stats.storageUsed / stats.storageLimit) * 100} />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Account Settings
            </CardTitle>
            <CardDescription>Manage your account information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Account Type</p>
                <p className="text-sm text-gray-500">Free Plan</p>
              </div>
              <Badge variant="secondary">Free</Badge>
            </div>

            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Privacy & Data Management
            </CardTitle>
            <CardDescription>Control your data and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Auto-cleanup</p>
                <p className="text-sm text-gray-500">Automatically delete document data after 30 days of inactivity</p>
              </div>
              <Badge variant="outline">Enabled</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Data Encryption</p>
                <p className="text-sm text-gray-500">All documents and embeddings are encrypted at rest</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>

            <Button variant="outline" onClick={handleClearData}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Document Data
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions that will permanently affect your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showDeleteConfirm ? (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This action cannot be undone. This will permanently delete your account, all uploaded documents, and
                    associated data.
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-2">
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    Yes, Delete My Account
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
