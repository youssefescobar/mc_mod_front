import { apiClient } from '@/services/api/client'
import type { ReminderItem } from '@/types/notifications'

interface RemindersResponse {
  success?: boolean
  reminders?: ReminderItem[]
}

export async function getReminders(groupId: string): Promise<ReminderItem[]> {
  const { data } = await apiClient.get<ReminderItem[] | RemindersResponse>(
    '/reminders',
    {
      params: { group_id: groupId },
    },
  )

  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && Array.isArray(data.reminders)) {
    return data.reminders
  }

  return []
}

export async function createReminder(payload: {
  group_id: string
  target_type: 'group' | 'pilgrim'
  pilgrim_id?: string
  text: string
  scheduled_at: string
  repeat_count: number
  repeat_interval_min: number
}): Promise<void> {
  await apiClient.post('/reminders', payload)
}

export async function cancelReminder(id: string): Promise<void> {
  await apiClient.patch(`/reminders/${id}/cancel`)
}
