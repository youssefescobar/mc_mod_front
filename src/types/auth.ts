export type UserRole = 'admin' | 'moderator' | 'pilgrim' | string

export interface AuthUser {
  id: string
  fullName: string
  role: UserRole
  language?: string
  email?: string
}

export interface LoginPayload {
  identifier: string
  password: string
}

export interface LoginResponse {
  token: string
  role: UserRole
  user_id: string
  full_name: string
  language?: string
}

export interface MeResponse {
  _id: string
  full_name: string
  role?: UserRole
  user_type?: UserRole
  email?: string
  language?: string
}
