import { apiClient } from '@/services/api/client'
import { cachedRequest, invalidateCachedRequest } from '@/services/cache/request-cache'

export interface MessageItem {
  _id: string
  sender_id: string
  group_id?: string
  recipient_id?: string | null
  content?: string
  type: 'text' | 'voice' | 'image' | 'tts' | 'meetpoint'
  is_urgent?: boolean
  original_text?: string
  created_at: string
}

interface ApiEnvelope<T> {
  data: T
}

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }
  return payload as T
}

export async function getGroupMessages(
  groupId: string,
  signal?: AbortSignal,
  force = false,
): Promise<MessageItem[]> {
  const key = `messages:group:${groupId}`
  const fetcher = async () => {
    const { data } = await apiClient.get<MessageItem[] | ApiEnvelope<MessageItem[]>>(
      `/messages/group/${groupId}`,
      {
        signal,
      },
    )
    return unwrap(data)
  }

  // Abortable requests should not be shared through cache/in-flight dedupe,
  // otherwise one aborted request can cancel another active consumer.
  if (signal) {
    return fetcher()
  }

  return cachedRequest(key, fetcher, {
    ttlMs: 2000,
    force,
  })
}

export async function sendGroupTextMessage(payload: {
  group_id: string
  content: string
  type?: 'text'
}): Promise<void> {
  await apiClient.post('/messages', {
    ...payload,
    type: 'text',
  })
  invalidateCachedRequest(`messages:group:${payload.group_id}`)
}

export async function sendGroupMessage(payload: {
  group_id: string
  content: string
  type: 'text' | 'tts'
  is_urgent?: boolean
  original_text?: string
}): Promise<void> {
  await apiClient.post('/messages', payload)
  invalidateCachedRequest(`messages:group:${payload.group_id}`)
}

export async function sendIndividualTextMessage(payload: {
  group_id: string
  recipient_id: string
  content: string
  type?: 'text'
}): Promise<void> {
  await apiClient.post('/messages/individual', {
    ...payload,
    type: 'text',
  })
  invalidateCachedRequest(`messages:group:${payload.group_id}`)
}

export async function deleteMessage(messageId: string, groupId?: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`)
  if (groupId) {
    invalidateCachedRequest(`messages:group:${groupId}`)
    return
  }
  invalidateCachedRequest('messages:group:')
}
