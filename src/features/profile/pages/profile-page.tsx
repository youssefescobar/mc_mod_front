import { useEffect, useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
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
import { useI18n } from '@/i18n/i18n-context'
import { languageOptions, getLanguageLabel } from '@/features/profile/language-options'
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

      <form onSubmit={onSubmit} className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('profile.full_name')}</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">{t('profile.language')}</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger id="language">
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

        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t('profile.current_language')}: {getLanguageLabel(language)}
        </div>

        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('profile.saving') : t('profile.save')}
        </Button>
      </form>
    </div>
  )
}
