import { apiClient } from '@/services/api/client'
import type { GroupDetails, GroupSummary } from '@/types/groups'
import type { ProvisionPilgrimInput, ProvisionPilgrimResult } from '@/types/pilgrims'

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

type RawPilgrim = {
  location?: { lat?: unknown; lng?: unknown } | null
  current_latitude?: unknown
  current_longitude?: unknown
  [key: string]: unknown
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizePilgrimLocation(pilgrim: RawPilgrim): GroupDetails['pilgrims'] extends Array<infer T> ? T : never {
  const latFromLocation = toFiniteNumber(pilgrim.location?.lat)
  const lngFromLocation = toFiniteNumber(pilgrim.location?.lng)

  const lat = latFromLocation ?? toFiniteNumber(pilgrim.current_latitude)
  const lng = lngFromLocation ?? toFiniteNumber(pilgrim.current_longitude)

  return {
    ...pilgrim,
    location:
      lat !== null && lng !== null
        ? {
            lat,
            lng,
          }
        : null,
  } as GroupDetails['pilgrims'] extends Array<infer T> ? T : never
}

function normalizeGroupDetails(group: GroupDetails): GroupDetails {
  return {
    ...group,
    pilgrims: Array.isArray(group.pilgrims)
      ? (group.pilgrims as unknown[]).map((pilgrim) => normalizePilgrimLocation(pilgrim as RawPilgrim))
      : [],
  }
}

function normalizeGroupSummary(group: RawGroupSummary): GroupSummary {
  const pilgrimsCountFromArray = Array.isArray(group.pilgrims) ? group.pilgrims.length : undefined
  const pilgrimIdsCount = Array.isArray(group.pilgrim_ids) ? group.pilgrim_ids.length : undefined

  return {
    ...group,
    pilgrim_count: group.pilgrim_count ?? pilgrimsCountFromArray ?? pilgrimIdsCount ?? 0,
  }
}

export async function getGroupsDashboard(signal?: AbortSignal): Promise<GroupSummary[]> {
  const { data } = await apiClient.get<RawGroupSummary[] | DashboardResponse>('/groups/dashboard', {
    signal,
  })

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

export async function deleteGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/groups/${groupId}`)
}

export async function getGroupDetails(groupId: string, signal?: AbortSignal): Promise<GroupDetails> {
  const { data } = await apiClient.get<GroupDetails | GroupDetailsResponse>(`/groups/${groupId}`, {
    signal,
  })

  if (data && typeof data === 'object' && '_id' in data) {
    return normalizeGroupDetails(data as GroupDetails)
  }

  if (data && typeof data === 'object' && 'data' in data) {
    const nested = (data as { data?: GroupDetails }).data
    if (nested && typeof nested === 'object' && '_id' in nested) {
      return normalizeGroupDetails(nested)
    }
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
  groupId: string,
  signal?: AbortSignal,
): Promise<Array<{ _id: string; name: string; area_type: 'suggestion' | 'meetpoint'; latitude: number; longitude: number; active: boolean; description?: string }>> {
  try {
    const response = await apiClient.get<any>(`/groups/${groupId}/suggested-areas`, {
      signal,
    })
    
    // Try multiple possible response formats
    let areas = null
    
    // Format 1: response.data.data = array
    if (response.data?.data && Array.isArray(response.data.data)) {
      areas = response.data.data
    }
    // Format 2: response.data = array directly
    else if (Array.isArray(response.data)) {
      areas = response.data
    }
    // Format 3: response.data.suggested_areas = array
    else if (response.data?.suggested_areas && Array.isArray(response.data.suggested_areas)) {
      areas = response.data.suggested_areas
    }
    
    return Array.isArray(areas) ? areas : []
  } catch (error) {
    if (signal?.aborted) {
      return []
    }
    console.error('getSuggestedAreas error:', error)
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

export async function updateSuggestedArea(
  groupId: string,
  areaId: string,
  name?: string,
  latitude?: number,
  longitude?: number,
  description?: string
): Promise<void> {
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (latitude !== undefined) data.latitude = latitude
  if (longitude !== undefined) data.longitude = longitude
  if (description !== undefined) data.description = description

  await apiClient.put(`/groups/${groupId}/suggested-areas/${areaId}`, data)
}

export async function removePilgrimFromGroup(groupId: string, pilgrimId: string): Promise<void> {
  await apiClient.post(`/groups/${groupId}/remove-pilgrim`, {
    user_id: pilgrimId,
  })
}

export async function provisionPilgrim(
  groupId: string,
  payload: ProvisionPilgrimInput,
): Promise<ProvisionPilgrimResult> {
  const { data } = await apiClient.post(`/auth/groups/${groupId}/provision-pilgrim`, payload)
  return data?.data ?? data
}

export async function provisionPilgrimsBulk(
  groupId: string,
  pilgrims: ProvisionPilgrimInput[],
): Promise<{
  summary: {
    total_rows: number
    created_count: number
    skipped_count: number
  }
  created: ProvisionPilgrimResult[]
  skipped: Array<{ row: number; reason: string }>
}> {
  const { data } = await apiClient.post(`/auth/groups/${groupId}/provision-pilgrims-bulk`, { pilgrims })
  return data?.data ?? data
}
