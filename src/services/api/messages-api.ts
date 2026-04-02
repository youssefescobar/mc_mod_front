import { apiClient } from '@/services/api/client'

export interface MessageItem {
  _id: string
  sender_id: string
  content?: string
  type: string
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

export async function getGroupMessages(groupId: string): Promise<MessageItem[]> {
  const { data } = await apiClient.get<MessageItem[] | ApiEnvelope<MessageItem[]>>(
    `/messages/group/${groupId}`,
  )
  return unwrap(data)
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
}
