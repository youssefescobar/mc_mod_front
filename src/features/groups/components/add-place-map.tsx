import L from 'leaflet'
import { useEffect, useRef } from 'react'

interface AddPlaceMapProps {
  selectedPoint: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number) => void
}

export function AddPlaceMap({ selectedPoint, onMapClick }: AddPlaceMapProps) {
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!mapInstanceRef.current) {
      const map = L.map('add-place-map').setView([21.4225, 39.8262], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      map.on('click', (event) => {
        const { lat, lng } = event.latlng
        onMapClick(lat, lng)
      })

      mapInstanceRef.current = map
    }
  }, [onMapClick])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (!selectedPoint) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
      return
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([selectedPoint.lat, selectedPoint.lng])
    } else {
      markerRef.current = L.marker([selectedPoint.lat, selectedPoint.lng], {
        icon: L.icon({
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          shadowSize: [41, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        }),
      })
        .bindPopup('Selected Point')
        .addTo(map)
        .openPopup()
    }

    map.setView([selectedPoint.lat, selectedPoint.lng], Math.max(map.getZoom(), 15), {
      animate: true,
    })
  }, [selectedPoint])

  return (
    <div
      id="add-place-map"
      className="h-80 w-full rounded-lg border border-border"
      style={{ minHeight: '320px' }}
    />
  )
}
