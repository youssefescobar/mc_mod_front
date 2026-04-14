import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import * as authApi from '@/services/api/auth-api'
import { storage } from '@/services/storage'
import type { AuthUser, LoginPayload } from '@/types/auth'

function isDevAuthBypass(): boolean {
  return (
    import.meta.env.DEV &&
    (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true' ||
      import.meta.env.VITE_DEV_AUTH_BYPASS === '1')
  )
}

/** Local UI preview only; has no valid API token. */
const DEV_AUTH_BYPASS_USER: AuthUser = {
  id: 'dev-preview-user',
  fullName: 'Dev preview',
  role: 'admin',
  email: 'dev-preview@local',
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (payload: LoginPayload) => Promise<void>
  signOut: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toAuthUser(payload: {
  id: string
  fullName: string
  role: string
  language?: string
  email?: string
}): AuthUser {
  return {
    id: payload.id,
    fullName: payload.fullName,
    role: payload.role,
    language: payload.language,
    email: payload.email,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    const token = storage.getToken()
    if (!token) {
      setUser(null)
      return
    }

    const me = await authApi.getMe()
    const role = me.role ?? me.user_type ?? 'pilgrim'
    setUser(
      toAuthUser({
        id: me._id,
        fullName: me.full_name,
        role,
        language: me.language,
        email: me.email,
      }),
    )
  }, [])

  const signIn = useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload)
    storage.setToken(response.token)
    setUser(
      toAuthUser({
        id: response.user_id,
        fullName: response.full_name,
        role: response.role,
        language: response.language,
      }),
    )
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Intentionally ignore logout failures and clear local session.
    } finally {
      storage.clearToken()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const boot = async () => {
      const token = storage.getToken()
      if (!token) {
        if (mounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        await refreshMe()
      } catch {
        storage.clearToken()
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void boot()

    return () => {
      mounted = false
    }
  }, [refreshMe])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'mc_mod_front_token') return
      if (event.newValue) return

      // Token removed in another tab/window -> invalidate local in-memory session.
      setUser(null)
    }

    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      signIn,
      signOut,
      refreshMe,
    }),
    [isLoading, refreshMe, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
