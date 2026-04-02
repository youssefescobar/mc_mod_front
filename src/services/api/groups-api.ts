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

type RawGroupSummary = GroupSummary & {
  pilgrims?: unknown[]
}

function normalizeGroupSummary(group: RawGroupSummary): GroupSummary {
  const pilgrimsCountFromArray = Array.isArray(group.pilgrims) ? group.pilgrims.length : undefined
  const pilgrimIdsCount = Array.isArray(group.pilgrim_ids) ? group.pilgrim_ids.length : undefined

  return {
    ...group,
    pilgrim_count: group.pilgrim_count ?? pilgrimsCountFromArray ?? pilgrimIdsCount ?? 0,
  }
}

export async function getGroupsDashboard(): Promise<GroupSummary[]> {
  const { data } = await apiClient.get<RawGroupSummary[] | DashboardResponse>('/groups/dashboard')

  if (Array.isArray(data)) {
    return data.map((group) => normalizeGroupSummary(group))
  }

  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return (data.data as RawGroupSummary[]).map((group) => normalizeGroupSummary(group))
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

export async function getSuggestedAreas(
  groupId: string
): Promise<Array<{ _id: string; name: string; area_type: 'suggestion' | 'meetpoint'; latitude: number; longitude: number; active: boolean }>> {
  try {
    const response = await apiClient.get<{
      success: boolean
      data?: Array<{ _id: string; name: string; area_type: 'suggestion' | 'meetpoint'; latitude: number; longitude: number; active: boolean }>
      suggested_areas?: Array<{ _id: string; name: string; area_type: 'suggestion' | 'meetpoint'; latitude: number; longitude: number; active: boolean }>
    }>(`/groups/${groupId}/suggested-areas`)

    const areas = response.data?.data || response.data?.suggested_areas || []
    return Array.isArray(areas) ? areas : []
  } catch {
    return []
  }
}

export async function addSuggestedArea(
  groupId: string,
  name: string,
  area_type: 'suggestion' | 'meetpoint',
  latitude: number,
  longitude: number,
  description?: string
): Promise<void> {
  await apiClient.post(`/groups/${groupId}/suggested-areas`, {
    name,
    area_type,
    latitude,
    longitude,
    description,
  })
}

export async function removeSuggestedArea(groupId: string, areaId: string): Promise<void> {
  await apiClient.delete(`/groups/${groupId}/suggested-areas/${areaId}`)
}

export async function removePilgrimFromGroup(groupId: string, pilgrimId: string): Promise<void> {
  await apiClient.post(`/groups/${groupId}/remove-pilgrim`, {
    pilgrim_id: pilgrimId,
  })
}
