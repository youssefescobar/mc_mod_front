import { AlertCircle, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GroupMap } from '@/features/groups/components/group-map'
import { getGroupDetails, getSuggestedAreas } from '@/services/api/groups-api'
import type { GroupDetails } from '@/types/groups'
import type { SuggestedArea, UserMarker } from '@/types/map'

export function GroupMapPage() {
  const { groupId = '' } = useParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [suggestedAreas, setSuggestedAreas] = useState<SuggestedArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return

    const load = async () => {
      try {
        const [groupData, areasData] = await Promise.all([
          getGroupDetails(groupId),
          getSuggestedAreas(groupId),
        ])
        setGroup(groupData)
        setSuggestedAreas(areasData)
      } catch (error) {
        console.error('Failed to load group map data', error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [groupId])

  if (loading) return <p className="text-sm text-muted-foreground">Loading group map...</p>
  if (!group) return <p className="text-sm text-muted-foreground">Group not found</p>

  const mapUsers: UserMarker[] = (group.pilgrims ?? [])
    .filter((p) => p.location && p.location.lat && p.location.lng)
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
          <Button asChild variant="outline">
            <Link to={`/app/groups/${group._id}`}>Back to Group</Link>
          </Button>
        }
      />

      {mapUsers.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No location data available for this group yet.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Live Group Map</CardTitle>
            <CardDescription>
              {mapUsers.length} pilgrims with location data and {suggestedAreas.length} marked areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupMap users={mapUsers} suggestedAreas={suggestedAreas} />
          </CardContent>
        </Card>
      )}

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
                <TableRow key={item._id}>
                  <TableCell className="font-medium">{item.full_name}</TableCell>
                  <TableCell>{item.location.lat.toFixed(5)}, {item.location.lng.toFixed(5)}</TableCell>
                  <TableCell>{item.is_online ? 'Online' : 'Offline'}</TableCell>
                  <TableCell className="text-right">
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
    </div>
  )
}
