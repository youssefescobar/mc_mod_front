export interface ProvisionPilgrimInput {
  full_name: string
  phone_number: string
  national_id?: string
  email?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  language?: 'en' | 'ar' | 'ur' | 'fr' | 'id' | 'tr'
  medical_history?: string
  room_number?: string
  room_id?: string
  bus_info?: string
  bus_id?: string
  hotel_name?: string
  hotel_id?: string
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

export interface ProvisionPilgrimResult {
  row?: number
  pilgrim: {
    _id: string
    full_name: string
    phone_number: string
    group_id?: string
  }
  one_time_login: {
    token: string
    expires_at: string
    qr_payload: string
    qr_code_data_url: string
  }
}

export type PilgrimProvisioningStatus = 'pending' | 'activated' | 'expired'

export interface PilgrimProvisioningLifecycleItem {
  pilgrim: {
    _id: string
    full_name: string
    phone_number: string
  }
  one_time_login: {
    token: string | null
    issued_at: string | null
    expires_at: string | null
    used_at: string | null
    qr_code_data_url: string | null
  }
  status: PilgrimProvisioningStatus
}

export interface PilgrimProvisioningSummary {
  total_provisioned: number
  pending_count: number
  activated_count: number
  expired_count: number
  pending_with_visible_token_count: number
}
