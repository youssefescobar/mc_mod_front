import { useMemo, type ReactNode } from 'react'

import { useAuth } from '@/features/auth/auth-context'
import { translate, type MessageKey } from '@/i18n/messages'
import { I18nContext, type I18nContextValue } from '@/i18n/i18n-store'

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const language = user?.language || 'en'

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      t: (key: MessageKey) => translate(language, key),
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
