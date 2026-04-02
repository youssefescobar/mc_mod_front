'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { SuggestedArea, UserMarker } from '@/types/map'

interface GroupMapProps {
  users: UserMarker[]
  suggestedAreas?: SuggestedArea[]
  onUserMarkerClick?: (userId: string) => void
  onMapClick?: (lat: number, lng: number) => void
  selectedUserId?: string | null
  selectedPoint?: { lat: number; lng: number } | null
}

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export function GroupMap({
  users,
  suggestedAreas = [],
  onUserMarkerClick,
  onMapClick,
  selectedUserId,
  selectedPoint,
}: GroupMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const userLayerRef = useRef<L.LayerGroup | null>(null)
  const areaLayerRef = useRef<L.LayerGroup | null>(null)
  const pickerMarkerRef = useRef<L.Marker | null>(null)
  const userMarkersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return
    }

    // Calculate center from users
    const validUsers = users.filter(
      (u) =>
        u.location != null &&
        Number.isFinite(u.location.lat) &&
        Number.isFinite(u.location.lng)
    )
    
    const avgLat =
      validUsers.length > 0
        ? validUsers.reduce((sum, u) => sum + (u.location?.lat || 0), 0) / validUsers.length
        : 21.4225
    const avgLng =
      validUsers.length > 0
        ? validUsers.reduce((sum, u) => sum + (u.location?.lng || 0), 0) / validUsers.length
        : 39.8264

    // Initialize map
    const map = L.map(mapRef.current).setView([avgLat, avgLng], validUsers.length > 0 ? 14 : 13)

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    userLayerRef.current = L.layerGroup().addTo(map)
    areaLayerRef.current = L.layerGroup().addTo(map)
    validUsers.forEach((user) => {
      if (
        !user.location ||
        !Number.isFinite(user.location.lat) ||
        !Number.isFinite(user.location.lng)
      ) {
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

      userMarkersRef.current.set(user._id, marker)
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      userLayerRef.current = null
      areaLayerRef.current = null
      pickerMarkerRef.current = null
      userMarkersRef.current.clear()
    }
  }, [users, onUserMarkerClick])

  useEffect(() => {
    const map = mapInstanceRef.current
    const userLayer = userLayerRef.current
    if (!map || !userLayer) return

    userLayer.clearLayers()
    userMarkersRef.current.clear()

    users
      .filter(
        (u) =>
          u.location != null &&
          Number.isFinite(u.location.lat) &&
          Number.isFinite(u.location.lng)
      )
      .forEach((user) => {
        if (!user.location) return

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
          .addTo(userLayer)

        if (onUserMarkerClick) {
          marker.on('click', () => {
            onUserMarkerClick(user._id)
          })
        }

        userMarkersRef.current.set(user._id, marker)
      })
  }, [users, onUserMarkerClick])

  useEffect(() => {
    const areaLayer = areaLayerRef.current
    if (!areaLayer) return

    areaLayer.clearLayers()
    console.log('Rendering areas on map. suggestedAreas:', suggestedAreas)
    
    suggestedAreas.forEach((area) => {
      // More lenient check: only skip if explicitly marked inactive or coordinates are invalid
      if (area.active === false) {
        console.log(`Skipping inactive area: ${area.name}`)
        return
      }
      
      if (!Number.isFinite(area.latitude) || !Number.isFinite(area.longitude)) {
        console.log(`Skipping area with invalid coordinates: ${area.name}`, { lat: area.latitude, lng: area.longitude })
        return
      }

      console.log(`Adding area marker: ${area.name} at ${area.latitude}, ${area.longitude}`)
      
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
        .addTo(areaLayer)
    })
  }, [suggestedAreas])

  useEffect(() => {
    if (!selectedUserId) return
    const map = mapInstanceRef.current
    const marker = userMarkersRef.current.get(selectedUserId)
    if (!map || !marker) return

    const position = marker.getLatLng()
    map.setView(position, Math.max(map.getZoom(), 15), { animate: true })
    marker.openPopup()
  }, [selectedUserId])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (!selectedPoint) {
      if (pickerMarkerRef.current) {
        map.removeLayer(pickerMarkerRef.current)
        pickerMarkerRef.current = null
      }
      return
    }

    const latLng = L.latLng(selectedPoint.lat, selectedPoint.lng)
    if (!pickerMarkerRef.current) {
      pickerMarkerRef.current = L.marker(latLng, { draggable: false })
        .addTo(map)
        .bindPopup('Selected point for new area')
    } else {
      pickerMarkerRef.current.setLatLng(latLng)
    }

    map.setView(latLng, Math.max(map.getZoom(), 15), { animate: true })
    pickerMarkerRef.current.openPopup()
  }, [selectedPoint])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !onMapClick) return

    const handleMapClick = (event: L.LeafletMouseEvent) => {
      onMapClick(event.latlng.lat, event.latlng.lng)
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [onMapClick])

  return <div ref={mapRef} className="relative z-0 h-full w-full rounded-lg" style={{ minHeight: '500px' }} />
}
