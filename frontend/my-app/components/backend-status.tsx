"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { checkBackendHealth } from "@/lib/api"

export function BackendStatus() {
  const [healthStatus, setHealthStatus] = useState<{
    status: string
    timestamp?: string
    services?: any
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkHealth()
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkHealth = async () => {
    try {
      const response = await checkBackendHealth()
      if (response.success) {
        setHealthStatus(response.data || { status: response.success ? "healthy" : "unhealthy" })
      } else {
        setHealthStatus({ status: "unhealthy" })
      }
    } catch (error) {
      setHealthStatus({ status: "disconnected" })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Checking backend...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800"
      case "unhealthy":
        return "bg-red-100 text-red-800"
      case "disconnected":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return "●"
      case "unhealthy":
        return "●"
      case "disconnected":
        return "●"
      default:
        return "●"
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Backend Status</span>
          <Badge className={getStatusColor(healthStatus?.status || "unknown")}>
            <span className="mr-1">{getStatusIcon(healthStatus?.status || "unknown")}</span>
            {healthStatus?.status || "unknown"}
          </Badge>
        </div>
        {healthStatus?.timestamp && (
          <p className="text-xs text-gray-500 mt-2">
            Last checked: {new Date(healthStatus.timestamp).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
