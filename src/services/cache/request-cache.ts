type CacheEntry<T> = {
  value?: T
  expiresAt?: number
  inFlight?: Promise<T>
}

const requestCache = new Map<string, CacheEntry<unknown>>()

export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number
    force?: boolean
  },
): Promise<T> {
  const ttlMs = options?.ttlMs ?? 3000
  const force = options?.force ?? false
  const now = Date.now()

  const existing = requestCache.get(key) as CacheEntry<T> | undefined

  if (!force && existing?.value !== undefined && (existing.expiresAt ?? 0) > now) {
    return existing.value
  }

  if (!force && existing?.inFlight) {
    return existing.inFlight
  }

  const inFlight = fetcher()
    .then((result) => {
      requestCache.set(key, {
        value: result,
        expiresAt: Date.now() + ttlMs,
      })
      return result
    })
    .catch((error) => {
      const current = requestCache.get(key) as CacheEntry<T> | undefined
      if (current?.inFlight) {
        requestCache.delete(key)
      }
      throw error
    })

  requestCache.set(key, {
    ...existing,
    inFlight,
  })

  return inFlight
}

export function invalidateCachedRequest(keyOrPrefix: string): void {
  for (const key of requestCache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      requestCache.delete(key)
    }
  }
}
