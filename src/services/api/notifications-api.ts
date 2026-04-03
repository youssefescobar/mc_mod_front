import { apiClient } from '@/services/api/client'
import { cachedRequest, invalidateCachedRequest } from '@/services/cache/request-cache'
import type { NotificationItem } from '@/types/notifications'

interface NotificationsResponse {
  success?: boolean
  notifications?: NotificationItem[]
  unread_count?: number
  total?: number
}

interface UnreadCountResponse {
  success?: boolean
  count?: number
  unread_count?: number
}

export async function getNotifications(options?: {
  signal?: AbortSignal
  force?: boolean
}): Promise<NotificationItem[]> {
  const fetcher = async () => {
    const { data } = await apiClient.get<NotificationItem[] | NotificationsResponse>(
      '/notifications',
      {
        signal: options?.signal,
      },
    )

    if (Array.isArray(data)) {
      return data
    }

    if (data && typeof data === 'object' && Array.isArray(data.notifications)) {
      return data.notifications
    }

    return []
  }

  // Abortable requests should not be shared through cache/in-flight dedupe,
  // otherwise one aborted consumer can cancel other callers.
  if (options?.signal) {
    return fetcher()
  }

  return cachedRequest('notifications:list', fetcher, {
    ttlMs: 3000,
    force: options?.force,
  })
}

export async function getUnreadCount(options?: {
  signal?: AbortSignal
  force?: boolean
}): Promise<number> {
  const fetcher = async () => {
    const { data } = await apiClient.get<UnreadCountResponse>(
      '/notifications/unread-count',
      {
        signal: options?.signal,
      },
    )
    return data.count ?? data.unread_count ?? 0
  }

  // Abortable requests should not be shared through cache/in-flight dedupe.
  if (options?.signal) {
    return fetcher()
  }

  return cachedRequest('notifications:unread-count', fetcher, {
    ttlMs: 3000,
    force: options?.force,
  })
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`)
  invalidateCachedRequest('notifications:')
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put('/notifications/read-all')
  invalidateCachedRequest('notifications:')
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`)
  invalidateCachedRequest('notifications:')
}

export async function deleteReadNotifications(): Promise<void> {
  await apiClient.delete('/notifications/read')
  invalidateCachedRequest('notifications:')
}
