'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { SuggestedArea, UserMarker } from '@/types/map'

interface GroupMapProps {
  users: UserMarker[]
  suggestedAreas?: SuggestedArea[]
  onUserMarkerClick?: (userId: string) => void
}

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export function GroupMap({ users, suggestedAreas = [], onUserMarkerClick }: GroupMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return
    }

    // Calculate center from users
    const validUsers = users.filter(u => u.location &&u.location.lat && u.location.lng)
    
    if (validUsers.length === 0) {
      // Default to Mecca if no user locations
      const map = L.map(mapRef.current).setView([21.4225, 39.8264], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      mapInstanceRef.current = map
      return
    }

    const avgLat = validUsers.reduce((sum, u) => sum + (u.location?.lat || 0), 0) / validUsers.length
    const avgLng = validUsers.reduce((sum, u) => sum + (u.location?.lng || 0), 0) / validUsers.length

    // Initialize map
    const map = L.map(mapRef.current).setView([avgLat, avgLng], 14)

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Add user markers
    validUsers.forEach((user) => {
      if (!user.location || !user.location.lat || !user.location.lng) {
        return
      }

      const isOnline = user.is_online
      const icon = L.divIcon({
        html: `
          <div class="relative">
            <div class="w-8 h-8 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white shadow-lg flex items-center justify-center cursor-pointer">
              <span class="text-white text-xs font-bold">${user.full_name.charAt(0).toUpperCase()}</span>
            </div>
            ${isOnline ? '<div class="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></div>' : ''}
          </div>
        `,
        className: 'user-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      })

      const marker = L.marker([user.location.lat, user.location.lng], { icon })
        .bindPopup(
          `<div class="text-sm">
            <p class="font-semibold">${user.full_name}</p>
            <p class="text-xs text-gray-600">${user.phone_number || 'No phone'}</p>
            ${user.battery_percent !== undefined ? `<p class="text-xs">Battery: ${user.battery_percent}%</p>` : ''}
            <p class="text-xs">${isOnline ? 'Online' : 'Offline'}</p>
          </div>`
        )
        .addTo(map)

      if (onUserMarkerClick) {
        marker.on('click', () => {
          onUserMarkerClick(user._id)
        })
      }
    })

    // Add suggested areas
    suggestedAreas.forEach((area) => {
      if (!area.active || !area.latitude || !area.longitude) {
        return
      }

      const icon = L.divIcon({
        html: `
          <div class="w-7 h-7 rounded-full ${
            area.area_type === 'meetpoint' ? 'bg-blue-500' : 'bg-yellow-500'
          } border-2 border-white shadow-lg flex items-center justify-center">
            <span class="text-white text-xs font-bold">${area.area_type === 'meetpoint' ? '📍' : '💡'}</span>
          </div>
        `,
        className: 'area-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      })

      L.marker([area.latitude, area.longitude], { icon })
        .bindPopup(
          `<div class="text-sm">
            <p class="font-semibold">${area.name}</p>
            <p class="text-xs">${area.area_type === 'meetpoint' ? 'Meetpoint' : 'Recommendation'}</p>
            ${area.description ? `<p class="text-xs text-gray-600">${area.description}</p>` : ''}
          </div>`
        )
        .addTo(map)
    })

    mapInstanceRef.current = map

    return () => {
      // Cleanup is optional here
    }
  }, [users, suggestedAreas, onUserMarkerClick])

  return <div ref={mapRef} className="h-full w-full rounded-lg" style={{ minHeight: '500px' }} />
}
