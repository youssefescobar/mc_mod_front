import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Globe, Pencil, Shield, UserCircle2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/features/auth/auth-context'
import { useI18n } from '@/i18n/use-i18n'
import { languageOptions } from '@/features/profile/language-options'
import { updateLanguage, updateProfile } from '@/services/api/auth-api'

export function ProfilePage() {
  const { user, refreshMe } = useAuth()
  const { t, language } = useI18n()
  const [fullName, setFullName] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    setFullName(user.fullName)
    setSelectedLanguage(user.language || 'en')
  }, [user])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setStatus(null)

    try {
      await updateProfile({ full_name: fullName })
      await updateLanguage(selectedLanguage)
      await refreshMe()
      setStatus(t('profile.saved'))
    } catch {
      setStatus(t('profile.failed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('profile.title')}
        description={t('profile.description')}
      />

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border/80 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="size-4 text-primary" />
              Account Overview
            </CardTitle>
            <CardDescription>Core account identity and language preference.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
                <Label htmlFor="fullName" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Pencil className="size-3" />
                  {t('profile.full_name')}
                </Label>
                <Input
                  id="fullName"
                  className="mt-2 bg-background"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="mt-1 text-sm font-semibold capitalize text-foreground">{user?.role || '-'}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{user?.email || '-'}</p>
              </div>
            </div>
          </CardContent>
          </Card>

          <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="size-4 text-primary" />
              Language
            </CardTitle>
            <CardDescription>Current app language and locale preference.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <Label htmlFor="language" className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Pencil className="size-3" />
                {t('profile.language')}
              </Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger id="language" className="mt-2 bg-background">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Security</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="size-4 text-primary" />
                Protected Session
              </p>
            </div>
          </CardContent>
          </Card>
        </div>

        {status ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {status === t('profile.saved') ? <CheckCircle2 className="size-4 text-green-600" /> : <AlertCircle className="size-4 text-red-600" />}
            <span>{status}</span>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t('profile.saving') : t('profile.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
