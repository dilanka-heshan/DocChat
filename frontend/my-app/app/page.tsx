import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, FileText, MessageSquare, Shield, Zap, Upload, Brain, Trash2 } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">DocChat</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          <Zap className="w-3 h-3 mr-1" />
          AI-Powered Document Analysis
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Ask Questions About Your Documents
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Upload PDFs, Word docs, or text files and get instant AI-powered answers. Our advanced RAG system understands
          your documents and provides contextual responses.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need to extract insights from your documents with AI
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Upload className="w-10 h-10 text-blue-600 mb-2" />
              <CardTitle>Easy Upload</CardTitle>
              <CardDescription>
                Drag and drop PDF, DOCX, or TXT files. Support for multiple document formats.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Brain className="w-10 h-10 text-purple-600 mb-2" />
              <CardTitle>AI-Powered Analysis</CardTitle>
              <CardDescription>
                Advanced language models understand context and provide accurate answers.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <MessageSquare className="w-10 h-10 text-green-600 mb-2" />
              <CardTitle>Chat Interface</CardTitle>
              <CardDescription>Natural conversation flow with your documents. Ask follow-up questions.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Shield className="w-10 h-10 text-red-600 mb-2" />
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>Your documents are encrypted and isolated. Data cleanup after sessions.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Zap className="w-10 h-10 text-yellow-600 mb-2" />
              <CardTitle>Fast Responses</CardTitle>
              <CardDescription>Optimized vector search and caching for lightning-fast answers.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Trash2 className="w-10 h-10 text-gray-600 mb-2" />
              <CardTitle>Auto Cleanup</CardTitle>
              <CardDescription>Automatic data deletion after sessions or on user request for privacy.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who are already extracting insights from their documents
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary">
              Start Free Today
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 DocuChat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
