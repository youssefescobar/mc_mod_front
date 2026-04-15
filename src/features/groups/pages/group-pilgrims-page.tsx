import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PilgrimProfileDialog } from '@/features/groups/components/pilgrim-profile-dialog'
import { UserActionMenu } from '@/features/groups/components/user-action-menu'
import { getGroupDetails, removePilgrimFromGroup } from '@/services/api/groups-api'
import type { GroupDetails, PilgrimInGroup } from '@/types/groups'

export function GroupPilgrimsPage() {
  const { groupId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [selectedPilgrim, setSelectedPilgrim] = useState<PilgrimInGroup | null>(null)
  const [showPilgrimDialog, setShowPilgrimDialog] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!groupId) return
    try {
      const groupData = await getGroupDetails(groupId)
      setGroup(groupData)
    } catch (error) {
      console.error('Failed to load group data:', error)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    void load()
  }, [load])

  const handleViewProfile = useCallback((pilgrimId: string) => {
    const pilgrim = group?.pilgrims?.find((p) => p._id === pilgrimId)
    if (!pilgrim) return

    setSelectedPilgrim(pilgrim)
    setShowPilgrimDialog(true)
  }, [group])

  useEffect(() => {
    const openPilgrimId = searchParams.get('openPilgrim')
    if (!group || !openPilgrimId) return

    const pilgrimExists = group.pilgrims?.some((p) => p._id === openPilgrimId)
    if (!pilgrimExists) return

    handleViewProfile(openPilgrimId)

    const next = new URLSearchParams(searchParams)
    next.delete('openPilgrim')
    setSearchParams(next, { replace: true })
  }, [group, handleViewProfile, searchParams, setSearchParams])

  const handleRemovePilgrim = async (pilgrimId: string) => {
    try {
      await removePilgrimFromGroup(groupId, pilgrimId)
      setGroup((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          pilgrims: prev.pilgrims?.filter((p) => p._id !== pilgrimId),
        }
      })
      setShowRemoveConfirm(null)
    } catch (error) {
      console.error('Failed to remove pilgrim:', error)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading group pilgrims...</p>
  if (!group) return <p className="text-sm text-muted-foreground">Group not found</p>

  const pilgrims = group.pilgrims ?? []

  return (
    <div>
      <PageHeader
        title={`${group.group_name} - Pilgrims`}
        description="Manage pilgrims in this group."
        action={
          <Button asChild variant="outline" size="icon" aria-label="Back to group" title="Back to group">
            <Link to={`/app/groups/${group._id}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="mt-0 rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pilgrim</TableHead>
              <TableHead>National ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-12">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pilgrims.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No pilgrims in this group yet</TableCell></TableRow>
            ) : pilgrims.map((pilgrim) => (
              <TableRow key={pilgrim._id}>
                <TableCell className="font-medium">{pilgrim.full_name}</TableCell>
                <TableCell>{pilgrim.national_id ?? '-'}</TableCell>
                <TableCell>{pilgrim.phone_number ?? '-'}</TableCell>
                <TableCell>{pilgrim.battery_percent ?? '-'}</TableCell>
                <TableCell>
                  {pilgrim.is_online ? (
                    <Badge>Online</Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-700">
                      Offline
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{pilgrim.location ? `${pilgrim.location.lat.toFixed(5)}, ${pilgrim.location.lng.toFixed(5)}` : '-'}</TableCell>
                <TableCell>
                  <Dialog open={showRemoveConfirm === pilgrim._id} onOpenChange={(open) => setShowRemoveConfirm(open ? pilgrim._id : null)}>
                    <UserActionMenu
                      user={{
                        _id: pilgrim._id,
                        full_name: pilgrim.full_name,
                        phone_number: pilgrim.phone_number,
                        national_id: pilgrim.national_id,
                        location: pilgrim.location || { lat: 0, lng: 0 },
                        battery_percent: pilgrim.battery_percent,
                        is_online: pilgrim.is_online || false,
                        last_active_at: pilgrim.last_active_at || undefined,
                        age: pilgrim.age,
                        gender: pilgrim.gender,
                        medical_history: pilgrim.medical_history,
                        hotel_name: pilgrim.hotel_name,
                        room_number: pilgrim.room_number,
                        bus_info: pilgrim.bus_info,
                        ethnicity: pilgrim.ethnicity,
                        visa: pilgrim.visa,
                      }}
                      onViewProfile={handleViewProfile}
                      onRemove={() => setShowRemoveConfirm(pilgrim._id)}
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Removal</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to remove <span className="font-semibold">{pilgrim.full_name}</span> from this group?
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowRemoveConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => void handleRemovePilgrim(pilgrim._id)}>Remove</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PilgrimProfileDialog pilgrim={selectedPilgrim} open={showPilgrimDialog} onOpenChange={setShowPilgrimDialog} />
    </div>
  )
}
