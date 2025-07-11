import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareClient({ req, res })
    
    // Refresh session if expired - required for Server Components
    const { data: { session } } = await supabase.auth.getSession()
    
    // Optional: Add authentication logic here
    // For now, just refresh the session and continue
    await supabase.auth.getUser()
    
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // If there's an error, continue without blocking
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
