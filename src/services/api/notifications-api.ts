import { apiClient } from '@/services/api/client'
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

export async function getNotifications(): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<NotificationItem[] | NotificationsResponse>(
    '/notifications',
  )

  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && Array.isArray(data.notifications)) {
    return data.notifications
  }

  return []
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<UnreadCountResponse>(
    '/notifications/unread-count',
  )
  return data.count ?? data.unread_count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put('/notifications/read-all')
}
