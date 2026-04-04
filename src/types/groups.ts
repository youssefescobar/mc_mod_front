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
