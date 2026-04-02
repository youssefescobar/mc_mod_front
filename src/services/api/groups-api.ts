import { apiClient } from '@/services/api/client'
import type { GroupDetails, GroupSummary } from '@/types/groups'

interface DashboardResponse {
  success?: boolean
  message?: string | null
  data?: GroupSummary[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface GroupDetailsResponse {
  success?: boolean
  message?: string | null
  _id?: string
  group_name?: string
  group_code?: string
  pilgrims?: GroupDetails['pilgrims']
}

interface GroupQrResponse {
  success?: boolean
  message?: string | null
  qr_code?: string
  group_code?: string
  data?: {
    qr_code?: string
    group_code?: string
  }
}

export async function getGroupsDashboard(): Promise<GroupSummary[]> {
  const { data } = await apiClient.get<GroupSummary[] | DashboardResponse>('/groups/dashboard')

  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data
  }

  return []
}

export async function createGroup(group_name: string): Promise<void> {
  await apiClient.post('/groups/create', { group_name })
}

export async function getGroupDetails(groupId: string): Promise<GroupDetails> {
  const { data } = await apiClient.get<GroupDetails | GroupDetailsResponse>(`/groups/${groupId}`)

  if (data && typeof data === 'object' && '_id' in data) {
    return data as GroupDetails
  }

  return {
    _id: groupId,
    group_name: 'Unknown Group',
    group_code: '-',
    pilgrims: [],
  }
}

export async function getGroupQr(groupId: string): Promise<string | null> {
  const { data } = await apiClient.get<GroupQrResponse>(`/groups/${groupId}/qr`)

  if (typeof data?.qr_code === 'string') {
    return data.qr_code
  }

  if (typeof data?.data?.qr_code === 'string') {
    return data.data.qr_code
  }

  return null
}
