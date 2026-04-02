import { AlertCircle, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { useI18n } from '@/i18n/use-i18n'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, signIn } = useAuth()
  const { t } = useI18n()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await signIn({ identifier, password })
      const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname
      navigate(nextPath || '/app/dashboard', { replace: true })
    } catch {
      setError(t('auth.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.15),transparent_50%)] px-4">
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader>
          <div className="mb-3 flex items-center gap-2 text-primary">
            <ShieldCheck className="size-5" />
            <span className="text-sm font-semibold">{t('app.name')} • {t('app.subtitle')}</span>
          </div>
          <CardTitle>{t('auth.title')}</CardTitle>
          <CardDescription>{t('auth.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('auth.identifier')}</Label>
              <Input
                id="identifier"
                autoComplete="username"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.signing_in') : t('auth.sign_in')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
