import ar from '@/i18n/locales/ar'
import de from '@/i18n/locales/de'
import en from '@/i18n/locales/en'
import es from '@/i18n/locales/es'
import hi from '@/i18n/locales/hi'
import it from '@/i18n/locales/it'
import ja from '@/i18n/locales/ja'
import ko from '@/i18n/locales/ko'
import pt from '@/i18n/locales/pt'
import ru from '@/i18n/locales/ru'
import tr from '@/i18n/locales/tr'
import uk from '@/i18n/locales/uk'
import zh from '@/i18n/locales/zh'
import { bus } from './bus'

const MESSAGES = { en, tr, de, es, it, pt, ru, zh, ja, ko, ar, hi, uk }

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'flag_en' },
  { code: 'tr', label: 'Türkçe', flag: 'flag_tr' },
  { code: 'de', label: 'Deutsch', flag: 'flag_de' },
  { code: 'es', label: 'Español', flag: 'flag_es' },
  { code: 'it', label: 'Italiano', flag: 'flag_it' },
  { code: 'pt', label: 'Português', flag: 'flag_pt' },
  { code: 'ru', label: 'Русский', flag: 'flag_ru' },
  { code: 'uk', label: 'Українська', flag: 'flag_uk' },
  { code: 'zh', label: '中文', flag: 'flag_zh' },
  { code: 'ja', label: '日本語', flag: 'flag_ja' },
  { code: 'ko', label: '한국어', flag: 'flag_ko' },
  { code: 'ar', label: 'العربية', flag: 'flag_ar' },
  { code: 'hi', label: 'हिन्दी', flag: 'flag_hi' },
]

let current = 'en'
const PLACEHOLDER_RE = /\{(\w+)\}/g

export const isRTL = () => current === 'ar'

function lookup(messages, key) {
  if (key in messages)
    return messages[key]
  // Support nested keys such as "Notifications.comeback".
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), messages)
}

/**
 * Translate a key, interpolating `{name}` placeholders.
 * Falls back to English, then to the key itself.
 */
export function t(key, params) {
  let text = lookup(MESSAGES[current], key) ?? lookup(MESSAGES.en, key) ?? key
  if (params && typeof text === 'string')
    text = text.replace(PLACEHOLDER_RE, (_, name) => (params[name] ?? `{${name}}`))
  return text
}

export function setLanguage(code) {
  current = MESSAGES[code] ? code : 'en'
  document.documentElement.lang = current
  const rotate = document.getElementById('rotate-text')
  if (rotate)
    rotate.textContent = t('rotate_device')
  bus.emit('i18n:change', current)
}

export const getLanguage = () => current
export const languageInfo = code => LANGUAGES.find(l => l.code === code) ?? LANGUAGES[0]

/** Locale-aware number formatting (1,234 / 1.234 ...). */
export function formatNumber(value) {
  try {
    return Math.round(value).toLocaleString(current)
  }
  catch {
    return String(Math.round(value))
  }
}
