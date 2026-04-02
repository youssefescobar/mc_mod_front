import { apiClient } from '@/services/api/client'
import type { InvitationItem } from '@/types/notifications'

interface InvitationsResponse {
  success?: boolean
  invitations?: InvitationItem[]
}

export async function getInvitations(): Promise<InvitationItem[]> {
  const { data } = await apiClient.get<InvitationItem[] | InvitationsResponse>(
    '/invitations',
  )

  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && Array.isArray(data.invitations)) {
    return data.invitations
  }

  return []
}

export async function sendGroupInvitation(
  groupId: string,
  inviteeEmail: string,
): Promise<void> {
  await apiClient.post(`/groups/${groupId}/invite`, { email: inviteeEmail })
}

export async function acceptInvitation(id: string): Promise<void> {
  await apiClient.post(`/invitations/${id}/accept`)
}

export async function declineInvitation(id: string): Promise<void> {
  await apiClient.post(`/invitations/${id}/decline`)
}
