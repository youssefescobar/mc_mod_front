import axios from 'axios'
import { apiClient } from '@/services/api/client'
import type { GroupDetails, GroupSummary } from '@/types/groups'
import type {
  PilgrimProvisioningLifecycleItem,
  PilgrimProvisioningSummary,
  ProvisionPilgrimInput,
  ProvisionPilgrimResult,
} from '@/types/pilgrims'

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
  id?: string
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
    _id: group._id || group.id || '',
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
  const { data } = await apiClient.get<GroupDetailsResponse | { data?: GroupDetails }>(`/groups/${groupId}`, {
    signal,
  })
  const payload = (data as { data?: GroupDetails })?.data ?? (data as GroupDetails)
  return normalizeGroupDetails(payload)
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
    type SuggestedAreasResponse =
      | Array<unknown>
      | {
          data?: unknown
          suggested_areas?: unknown
        }

    const response = await apiClient.get<SuggestedAreasResponse>(`/groups/${groupId}/suggested-areas`, {
      signal,
    })
    
    // Try multiple possible response formats
    let areas = null
    
    // Format 1: response.data.data = array
    if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.data)) {
      areas = response.data.data
    }
    // Format 2: response.data = array directly
    else if (Array.isArray(response.data)) {
      areas = response.data
    }
    // Format 3: response.data.suggested_areas = array
    else if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.suggested_areas)) {
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

export interface GroupResourceOptionRoom {
  _id: string
  room_number: string
  floor?: string | null
  capacity?: number
  active?: boolean
}

export interface GroupResourceOptionHotel {
  _id: string
  name: string
  city?: string | null
  rooms?: GroupResourceOptionRoom[]
}

export interface GroupResourceOptionBus {
  _id: string
  bus_number: string
  destination: string
  departure_time?: string
  driver_name?: string
}

let provisioningApiSupported: boolean | null = null

const emptyProvisioningSummary: PilgrimProvisioningSummary = {
  total_provisioned: 0,
  pending_count: 0,
  activated_count: 0,
  expired_count: 0,
  pending_with_visible_token_count: 0,
}

export async function getGroupResourceOptions(
  groupId: string,
): Promise<{ hotels: GroupResourceOptionHotel[]; buses: GroupResourceOptionBus[] }> {
  try {
    const { data } = await apiClient.get(`/groups/${groupId}/resource-options`)
    const payload = data?.data ?? data ?? {}

    return {
      hotels: Array.isArray(payload.hotels) ? payload.hotels : [],
      buses: Array.isArray(payload.buses) ? payload.buses : [],
    }
  } catch (error) {
    // Older backend might not expose /resource-options yet.
    // Fall back to /groups/:id and read assigned_* arrays.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const group = await getGroupDetails(groupId)
      return {
        hotels: Array.isArray(group.assigned_hotel_ids) ? group.assigned_hotel_ids : [],
        buses: Array.isArray(group.assigned_bus_ids) ? group.assigned_bus_ids : [],
      }
    }
    throw error
  }
}

export async function getGroupProvisioningStatus(
  groupId: string,
): Promise<{ summary: PilgrimProvisioningSummary; items: PilgrimProvisioningLifecycleItem[] }> {
  if (provisioningApiSupported === false) {
    return { summary: emptyProvisioningSummary, items: [] }
  }

  try {
    const { data } = await apiClient.get(`/auth/groups/${groupId}/provisioning-status`)
    const payload = data?.data ?? data ?? {}

    provisioningApiSupported = true
    const summary = payload.summary ?? emptyProvisioningSummary

    return {
      summary,
      items: Array.isArray(payload.items) ? payload.items : [],
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      provisioningApiSupported = false
      return {
        summary: emptyProvisioningSummary,
        items: [],
      }
    }
    throw error
  }
}

export async function reissueGroupPilgrimLogin(
  groupId: string,
  pilgrimId: string,
): Promise<{ pilgrim: { _id: string; full_name: string; phone_number: string }; one_time_login: { token: string; expires_at: string; qr_payload: string; qr_code_data_url: string } }> {
  const { data } = await apiClient.post(`/auth/groups/${groupId}/pilgrims/${pilgrimId}/reissue-login`)
  return data?.data ?? data
}

export async function deleteProvisionedPilgrim(
  groupId: string,
  pilgrimId: string,
): Promise<void> {
  await apiClient.delete(`/auth/groups/${groupId}/pilgrims/${pilgrimId}`)
}
