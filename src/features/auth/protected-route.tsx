import { LogOut } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'

export function ProtectedRoute() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading moderator session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.role !== 'moderator' && user?.role !== 'admin') {
    // Pilgrims cannot access moderator dashboard - show access denied
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            This dashboard is for moderators only.
          </p>
          <p className="text-sm text-muted-foreground">
            Pilgrims should use the Munawwara Care mobile app.
          </p>
        </div>
        <Button variant="outline" onClick={() => void signOut()} className="gap-2">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    )
  }

  return <Outlet />
}
