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
  location: Location
  battery_percent?: number
  is_online: boolean
  last_active_at?: string
}
