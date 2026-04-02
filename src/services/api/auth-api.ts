import { apiClient } from '@/services/api/client'
import type { LoginPayload, LoginResponse, MeResponse } from '@/types/auth'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>('/auth/me')
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function updateProfile(payload: {
  full_name: string
  phone_number?: string
}): Promise<void> {
  await apiClient.put('/auth/update-profile', payload)
}

export async function updateLanguage(language: string): Promise<void> {
  await apiClient.put('/auth/update-language', { language })
}
