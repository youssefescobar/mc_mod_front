import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { useAuth } from '@/features/auth/auth-context'
import { translate, type MessageKey } from '@/i18n/messages'

interface I18nContextValue {
  language: string
  t: (key: MessageKey) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

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

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
