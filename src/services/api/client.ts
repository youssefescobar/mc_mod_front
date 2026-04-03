import axios from 'axios'

import { storage } from '@/services/storage'

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.toString() || 'http://localhost:5000/api'

function ensureSecureApiBase(url: string): void {
  try {
    const parsed = new URL(url)
    if (import.meta.env.PROD && parsed.protocol !== 'https:') {
      throw new Error(`Insecure API base URL in production: ${url}`)
    }
  } catch (error) {
    if (import.meta.env.PROD) {
      throw error
    }
  }
}

ensureSecureApiBase(baseURL)

const MAX_GET_RETRIES = 2

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function shouldRetryRequest(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (error.code === 'ERR_CANCELED') return false

  const method = error.config?.method?.toLowerCase()
  if (method !== 'get') return false

  const status = error.response?.status
  if (status && status < 500) return false

  return true
}

export const apiClient = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = storage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldRetryRequest(error)) {
      const config = error.config as (typeof error.config & { __retryCount?: number }) | undefined
      const retryCount = config?.__retryCount ?? 0

      if (config && retryCount < MAX_GET_RETRIES) {
        config.__retryCount = retryCount + 1
        const baseDelay = 250 * 2 ** retryCount
        const jitter = Math.floor(Math.random() * 150)
        await sleep(baseDelay + jitter)
        return apiClient.request(config)
      }
    }

    if (error?.response?.status === 401) {
      storage.clearToken()
    }
    return Promise.reject(error)
  },
)
