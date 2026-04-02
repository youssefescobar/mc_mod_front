export interface PilgrimInGroup {
  _id: string
  full_name: string
  national_id?: string
  phone_number?: string
  battery_percent?: number
  is_online?: boolean
  last_active_at?: string
  location?: {
    lat: number
    lng: number
  } | null
}

export interface GroupSummary {
  _id: string
  group_name: string
  group_code: string
  pilgrim_count?: number
  pilgrim_ids?: string[]
  pilgrims?: PilgrimInGroup[]
  moderator_ids?: Array<{ _id: string; full_name: string }>
}

export interface GroupDetails extends GroupSummary {
  pilgrims?: PilgrimInGroup[]
}
