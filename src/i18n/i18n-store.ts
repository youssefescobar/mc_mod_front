import { createContext } from 'react'

import type { MessageKey } from '@/i18n/messages'

export interface I18nContextValue {
  language: string
  t: (key: MessageKey) => string
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined)
