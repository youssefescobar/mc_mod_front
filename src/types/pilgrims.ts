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
  bus_info?: string
  hotel_name?: string
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
