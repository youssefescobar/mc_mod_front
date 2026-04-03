import { AlertCircle, ChevronDown, ExternalLink, Search, Trash2, Edit2, ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AddPlaceMap } from '@/features/groups/components/add-place-map'
import { GroupMap } from '@/features/groups/components/group-map'
import { addSuggestedArea, getGroupDetails, getSuggestedAreas, removeSuggestedArea, updateSuggestedArea } from '@/services/api/groups-api'
import type { GroupDetails } from '@/types/groups'
import type { SuggestedArea, UserMarker } from '@/types/map'

export function GroupMapPage() {
  const { groupId = '' } = useParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [suggestedAreas, setSuggestedAreas] = useState<SuggestedArea[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)
  const [isSavingArea, setIsSavingArea] = useState(false)
  const [areaError, setAreaError] = useState<string | null>(null)
  const [selectedPilgrimId, setSelectedPilgrimId] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const mapSectionRef = useRef<HTMLDivElement | null>(null)
  const [areaForm, setAreaForm] = useState({
    name: '',
    area_type: 'suggestion' as 'suggestion' | 'meetpoint',
    latitude: '',
    longitude: '',
    description: '',
  })
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    description: '',
  })
  const loadSeqRef = useRef(0)
  const [isEditingArea, setIsEditingArea] = useState(false)
  const [deletingAreaId, setDeletingAreaId] = useState<string | null>(null)
  const [isDeletingArea, setIsDeletingArea] = useState(false)

  useEffect(() => {
    if (!groupId) return

    const controller = new AbortController()
    const requestSeq = ++loadSeqRef.current

    const load = async () => {
      try {
        const [groupData, areasData] = await Promise.all([
          getGroupDetails(groupId, controller.signal),
          getSuggestedAreas(groupId, controller.signal),
        ])
        if (loadSeqRef.current !== requestSeq) return
        console.log('Loaded suggested areas:', areasData)
        setGroup(groupData)
        setSuggestedAreas(areasData)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load group map data', error)
      } finally {
        if (loadSeqRef.current !== requestSeq) return
        setLoading(false)
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [groupId])

  if (loading) return <p className="text-sm text-muted-foreground">Loading group map...</p>
  if (!group) return <p className="text-sm text-muted-foreground">Group not found</p>

  const onCreateArea = async () => {
    if (!groupId || isSavingArea) return

    const lat = Number(areaForm.latitude)
    const lng = Number(areaForm.longitude)

    if (!areaForm.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAreaError('Name, latitude, and longitude are required')
      return
    }

    setIsSavingArea(true)
    setAreaError(null)

    try {
      await addSuggestedArea(
        groupId,
        areaForm.name.trim(),
        areaForm.area_type,
        lat,
        lng,
        areaForm.description.trim() || undefined,
      )

      const requestSeq = ++loadSeqRef.current
      const refreshedAreas = await getSuggestedAreas(groupId)
      if (loadSeqRef.current !== requestSeq) return
      setSuggestedAreas(refreshedAreas)
      setAreaForm({
        name: '',
        area_type: 'suggestion',
        latitude: '',
        longitude: '',
        description: '',
      })
    } catch (error) {
      console.error('Failed to add suggested area', error)
      setAreaError('Failed to add place. If this is a meetpoint, there may already be one active.')
    } finally {
      setIsSavingArea(false)
    }
  }

  const searchOnMap = async () => {
    const query = searchQuery.trim()
    if (!query || isSearching) return

    setIsSearching(true)
    setAreaError(null)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      )
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const results = (await response.json()) as Array<{ lat: string; lon: string }>
      if (!results.length) {
        setAreaError('No matching place found on map search')
        return
      }

      const lat = Number(results[0].lat)
      const lng = Number(results[0].lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setAreaError('Search returned invalid coordinates')
        return
      }

      setSelectedPoint({ lat, lng })
      setAreaForm((prev) => ({
        ...prev,
        latitude: String(lat),
        longitude: String(lng),
      }))
      setIsAddPanelOpen(true)
    } catch (error) {
      console.error('Map search failed', error)
      setAreaError('Map search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleEditArea = (area: SuggestedArea) => {
    setEditingAreaId(area._id)
    setEditForm({
      name: area.name,
      latitude: String(area.latitude),
      longitude: String(area.longitude),
      description: area.description || '',
    })
  }

  const onSaveEditArea = async () => {
    if (!groupId || !editingAreaId || isEditingArea) return

    const lat = Number(editForm.latitude)
    const lng = Number(editForm.longitude)

    if (!editForm.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAreaError('Name, latitude, and longitude are required')
      return
    }

    setIsEditingArea(true)
    setAreaError(null)

    try {
      await updateSuggestedArea(
        groupId,
        editingAreaId,
        editForm.name.trim(),
        lat,
        lng,
        editForm.description.trim() || undefined,
      )

      const requestSeq = ++loadSeqRef.current
      const refreshedAreas = await getSuggestedAreas(groupId)
      if (loadSeqRef.current !== requestSeq) return
      setSuggestedAreas(refreshedAreas)
      setEditingAreaId(null)
    } catch (error) {
      console.error('Failed to update suggested area', error)
      setAreaError('Failed to update place.')
    } finally {
      setIsEditingArea(false)
    }
  }

  const onDeleteArea = async () => {
    if (!groupId || !deletingAreaId || isDeletingArea) return

    setIsDeletingArea(true)
    try {
      await removeSuggestedArea(groupId, deletingAreaId)
      const requestSeq = ++loadSeqRef.current
      const refreshedAreas = await getSuggestedAreas(groupId)
      if (loadSeqRef.current !== requestSeq) return
      setSuggestedAreas(refreshedAreas)
      setDeletingAreaId(null)
    } catch (error) {
      console.error('Failed to delete suggested area', error)
      setAreaError('Failed to delete place.')
    } finally {
      setIsDeletingArea(false)
    }
  }

  const mapUsers: UserMarker[] = (group.pilgrims ?? [])
    .filter(
      (p) =>
        p.location != null &&
        Number.isFinite(p.location.lat) &&
        Number.isFinite(p.location.lng)
    )
    .map((p) => ({
      _id: p._id,
      full_name: p.full_name,
      phone_number: p.phone_number,
      national_id: p.national_id,
      location: p.location!,
      battery_percent: p.battery_percent,
      is_online: p.is_online || false,
      last_active_at: p.last_active_at || undefined,
    }))

  return (
    <div>
      <PageHeader
        title={`${group.group_name} - Group Map`}
        description="Live group map with pilgrim locations, suggested areas, and meetpoints."
        action={
          <Button asChild variant="outline" size="icon" aria-label="Back to group" title="Back to group">
            <Link to={`/app/groups/${group._id}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Add Place</CardTitle>
            <CardDescription>
              Add a recommended place or an urgent meetpoint for this group.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isAddPanelOpen ? 'Collapse add place panel' : 'Expand add place panel'}
            onClick={() => setIsAddPanelOpen((prev) => !prev)}
          >
            <ChevronDown className={`size-4 transition-transform ${isAddPanelOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CardHeader>
        {isAddPanelOpen ? (
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="space-y-1">
            <Label>Search on map</Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search location (example: Al Haram Gate 3)"
              />
              <Button type="button" variant="outline" onClick={() => void searchOnMap()} disabled={isSearching}>
                <Search className="mr-2 size-4" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Map and Form in One View */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Map Section */}
            <div>
              <Label className="mb-2 block text-sm font-medium">Map Picker</Label>
              <AddPlaceMap
                selectedPoint={selectedPoint}
                onMapClick={(lat, lng) => {
                  setSelectedPoint({ lat, lng })
                  setAreaForm((prev) => ({
                    ...prev,
                    latitude: String(lat),
                    longitude: String(lng),
                  }))
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Click on the map to set coordinates, or search above to jump to a location.
              </p>
            </div>

            {/* Form Section */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={areaForm.name}
                  onChange={(event) =>
                    setAreaForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Example: Gate 3 Meeting Point"
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={areaForm.area_type}
                  onValueChange={(value) =>
                    setAreaForm((prev) => ({ ...prev, area_type: value as 'suggestion' | 'meetpoint' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggestion">Recommended Place</SelectItem>
                    <SelectItem value="meetpoint">Meetpoint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={areaForm.latitude}
                  onChange={(event) =>
                    setAreaForm((prev) => ({ ...prev, latitude: event.target.value }))
                  }
                  placeholder="21.4225"
                />
              </div>
              <div className="space-y-1">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={areaForm.longitude}
                  onChange={(event) =>
                    setAreaForm((prev) => ({ ...prev, longitude: event.target.value }))
                  }
                  placeholder="39.8262"
                />
              </div>
              <div className="space-y-1">
                <Label>Description (optional)</Label>
                <Input
                  value={areaForm.description}
                  onChange={(event) =>
                    setAreaForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Short instructions for pilgrims"
                />
              </div>
              <Button onClick={() => void onCreateArea()} disabled={isSavingArea} className="w-full">
                {isSavingArea ? 'Adding...' : 'Add Place'}
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {areaError ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{areaError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        ) : null}
      </Card>

      {mapUsers.length === 0 ? (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No pilgrim location yet. You can still search and click map to add places.</AlertDescription>
        </Alert>
      ) : null}

      <div ref={mapSectionRef}>
        <Card>
          <CardHeader>
            <CardTitle>Live Group Map</CardTitle>
            <CardDescription>
              {mapUsers.length} pilgrims with location data and {suggestedAreas.length} marked areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupMap
              users={mapUsers}
              suggestedAreas={suggestedAreas}
              selectedUserId={selectedPilgrimId}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pilgrim</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Navigate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mapUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No mapped pilgrims yet
                </TableCell>
              </TableRow>
            ) : (
              mapUsers.map((item) => (
                <TableRow
                  key={item._id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedPilgrimId(item._id)
                    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <TableCell className="font-medium">{item.full_name}</TableCell>
                  <TableCell>{item.location.lat.toFixed(5)}, {item.location.lng.toFixed(5)}</TableCell>
                  <TableCell>{item.is_online ? 'Online' : 'Offline'}</TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <Button asChild size="sm" variant="outline">
                      <a href={`https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 size-4" />Open
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Suggested Areas Management */}
      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Suggested Places & Meetpoints</h2>
          <p className="text-sm text-muted-foreground">Manage all places and meetpoints for this group.</p>
        </div>
        {suggestedAreas.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground">
            <p>No places or meetpoints added yet. Use the "Add Place" panel above to create one.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestedAreas.map((area) => (
                <TableRow key={area._id}>
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell>
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      area.area_type === 'meetpoint'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                    }`}>
                      {area.area_type === 'meetpoint' ? 'Meetpoint' : 'Suggestion'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{area.latitude.toFixed(5)}, {area.longitude.toFixed(5)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Edit Dialog */}
                      <Dialog open={editingAreaId === area._id} onOpenChange={(open) => {
                        if (!open) setEditingAreaId(null)
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditArea(area)}
                          >
                            <Edit2 className="mr-2 size-4" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Place</DialogTitle>
                            <DialogDescription>
                              Update the details for this place or meetpoint.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <Label>Name</Label>
                              <Input
                                value={editForm.name}
                                onChange={(event) =>
                                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                                }
                                placeholder="Example: Gate 3 Meeting Point"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Latitude</Label>
                              <Input
                                type="number"
                                step="any"
                                value={editForm.latitude}
                                onChange={(event) =>
                                  setEditForm((prev) => ({ ...prev, latitude: event.target.value }))
                                }
                                placeholder="21.4225"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Longitude</Label>
                              <Input
                                type="number"
                                step="any"
                                value={editForm.longitude}
                                onChange={(event) =>
                                  setEditForm((prev) => ({ ...prev, longitude: event.target.value }))
                                }
                                placeholder="39.8262"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Description (optional)</Label>
                              <Input
                                value={editForm.description}
                                onChange={(event) =>
                                  setEditForm((prev) => ({ ...prev, description: event.target.value }))
                                }
                                placeholder="Short instructions for pilgrims"
                              />
                            </div>
                            {areaError && editingAreaId === area._id ? (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{areaError}</AlertDescription>
                              </Alert>
                            ) : null}
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setEditingAreaId(null)}>
                                Cancel
                              </Button>
                              <Button onClick={() => void onSaveEditArea()} disabled={isEditingArea}>
                                {isEditingArea ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Delete Dialog */}
                      <Dialog open={deletingAreaId === area._id} onOpenChange={(open) => {
                        if (!open) setDeletingAreaId(null)
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingAreaId(area._id)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Place</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete "{area.name}"? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setDeletingAreaId(null)}>
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => void onDeleteArea()}
                              disabled={isDeletingArea}
                            >
                              {isDeletingArea ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
