export const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'العربية', value: 'ar' },
  { label: 'اردو', value: 'ur' },
  { label: 'Français', value: 'fr' },
  { label: 'Bahasa', value: 'id' },
  { label: 'Türkçe', value: 'tr' },
] as const

export type LanguageValue = (typeof languageOptions)[number]['value']

export function getLanguageLabel(value: string) {
  return languageOptions.find((option) => option.value === value)?.label ?? 'English'
}
