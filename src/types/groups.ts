export interface PilgrimInGroup {
  _id: string
  full_name: string
  national_id?: string
  phone_number?: string
  email?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  medical_history?: string
  hotel_name?: string
  room_number?: string
  bus_info?: string
  ethnicity?:
    | 'Arab'
    | 'South Asian'
    | 'Turkic'
    | 'Persian'
    | 'Malay/Indonesian'
    | 'African'
    | 'Kurdish'
    | 'Berber'
    | 'European Muslim'
    | 'Other'
  visa?: {
    visa_number?: string
    issue_date?: string
    expiry_date?: string
    status?: 'pending' | 'issued' | 'rejected' | 'expired' | 'unknown'
  }
  battery_percent?: number
  is_online?: boolean
  last_active_at?: string
  location?: {
    lat: number
    lng: number
  } | null
}

export interface GroupAssignedHotelRoom {
  _id: string
  room_number: string
  floor?: string | null
  capacity?: number
  active?: boolean
}

export interface GroupAssignedHotel {
  _id: string
  name: string
  city?: string | null
  rooms?: GroupAssignedHotelRoom[]
}

export interface GroupAssignedBus {
  _id: string
  bus_number: string
  destination: string
  departure_time?: string
  driver_name?: string
}

export interface GroupSummary {
  _id: string
  group_name: string
  group_code: string
  check_in_date?: string
  check_out_date?: string
  pilgrim_count?: number
  pilgrim_ids?: string[]
  pilgrims?: PilgrimInGroup[]
  moderator_ids?: Array<{ _id: string; full_name: string }>
  assigned_hotel_ids?: GroupAssignedHotel[]
  assigned_bus_ids?: GroupAssignedBus[]
}

export interface GroupDetails extends GroupSummary {
  pilgrims?: PilgrimInGroup[]
}

