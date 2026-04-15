export interface Location {
  lat: number
  lng: number
}

export interface SuggestedArea {
  _id: string
  name: string
  description?: string
  area_type: 'suggestion' | 'meetpoint'
  latitude: number
  longitude: number
  active: boolean
}

export interface UserMarker {
  _id: string
  full_name: string
  phone_number?: string
  national_id?: string
  location?: Location | null
  battery_percent?: number
  is_online?: boolean
  last_active_at?: string
  // Extended profile fields
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
}
