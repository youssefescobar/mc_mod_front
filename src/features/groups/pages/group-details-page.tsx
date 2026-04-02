import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, MapPin } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GroupMap } from '@/features/groups/components/group-map'
import { PilgrimProfileDialog } from '@/features/groups/components/pilgrim-profile-dialog'
import { ShareGroupCodeDialog } from '@/features/groups/components/share-group-code-dialog'
import { UserActionMenu } from '@/features/groups/components/user-action-menu'
import { useI18n } from '@/i18n/use-i18n'
import {
  getSuggestedAreas,
  getGroupDetails,
  removePilgrimFromGroup,
} from '@/services/api/groups-api'
import type { GroupDetails } from '@/types/groups'
import type { SuggestedArea, UserMarker } from '@/types/map'

export function GroupDetailsPage() {
  const { groupId = '' } = useParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [suggestedAreas, setSuggestedAreas] = useState<SuggestedArea[]>([])
  const [selectedPilgrim, setSelectedPilgrim] = useState<UserMarker | null>(null)
  const [showPilgrimDialog, setShowPilgrimDialog] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()

  useEffect(() => {
    if (!groupId) {
      return
    }

    const load = async () => {
      try {
        const [groupData, areasData] = await Promise.all([
          getGroupDetails(groupId),
          getSuggestedAreas(groupId),
        ])
        setGroup(groupData)
        setSuggestedAreas(areasData)
      } catch (error) {
        console.error('Failed to load group data:', error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [groupId])

  const handleViewProfile = (pilgrimId: string) => {
    const pilgrim = group?.pilgrims?.find((p) => p._id === pilgrimId)
    if (pilgrim) {
      const userMarker: UserMarker = {
        _id: pilgrim._id,
        full_name: pilgrim.full_name,
        phone_number: pilgrim.phone_number,
        national_id: pilgrim.national_id,
        location: pilgrim.location || { lat: 0, lng: 0 },
        battery_percent: pilgrim.battery_percent,
        is_online: pilgrim.is_online || false,
        last_active_at: pilgrim.last_active_at || undefined,
      }
      setSelectedPilgrim(userMarker)
      setShowPilgrimDialog(true)
    }
  }

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

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading group details...</p>
    )
  }

  if (!group) {
    return (
      <p className="text-sm text-muted-foreground">Group not found</p>
    )
  }

  const pilgrims = group.pilgrims ?? []
  const leadModerator = group.moderator_ids?.[0]?.full_name
  const mapUsers: UserMarker[] = pilgrims
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
        title={group.group_name}
        description={t('group.description')}
        action={
          <div className="flex gap-2">
            <ShareGroupCodeDialog
              groupId={group._id}
              groupName={group.group_name}
              groupCode={group.group_code}
              moderatorName={leadModerator}
            />
            <Button asChild variant="outline">
              <Link to="/app/reminders">{t('group.schedule_reminders')}</Link>
            </Button>
            <Button asChild>
              <Link to="/app/chats/group">{t('group.open_chat')}</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('group.code')}</CardTitle>
            <CardDescription>{t('share.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="text-base">{group.group_code}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('group.pilgrims')}</CardTitle>
            <CardDescription>{t('dashboard.groups_snapshot_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pilgrims.length}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('group.moderators')}</CardTitle>
            <CardDescription>{t('dashboard.groups_snapshot_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {group.moderator_ids?.length ?? 0}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roster" className="mt-6 w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roster">Pilgrim Roster</TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="m-1.5 size-3.5" />
            Live Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-4">
          {pilgrims.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No pilgrims in this group yet</AlertDescription>
            </Alert>
          )}
          {pilgrims.length > 0 && (
            <div className="rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('map.pilgrim')}</TableHead>
                    <TableHead>{t('group.national_id')}</TableHead>
                    <TableHead>{t('group.phone')}</TableHead>
                    <TableHead>{t('group.battery')}</TableHead>
                    <TableHead>{t('group.status')}</TableHead>
                    <TableHead>{t('group.location')}</TableHead>
                    <TableHead className="w-12">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pilgrims.map((pilgrim) => (
                    <TableRow key={pilgrim._id}>
                      <TableCell className="font-medium">{pilgrim.full_name}</TableCell>
                      <TableCell>{pilgrim.national_id ?? '-'}</TableCell>
                      <TableCell>{pilgrim.phone_number ?? '-'}</TableCell>
                      <TableCell>{pilgrim.battery_percent ?? '-'}</TableCell>
                      <TableCell>
                        {pilgrim.is_online ? (
                          <Badge>{t('group.online')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('group.offline')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pilgrim.location
                          ? `${pilgrim.location.lat.toFixed(5)}, ${pilgrim.location.lng.toFixed(5)}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Dialog
                          open={showRemoveConfirm === pilgrim._id}
                          onOpenChange={(open) => {
                            setShowRemoveConfirm(open ? pilgrim._id : null)
                          }}
                        >
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
                            }}
                            onViewProfile={handleViewProfile}
                            onRemove={() => setShowRemoveConfirm(pilgrim._id)}
                          />
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Removal</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to remove{' '}
                                <span className="font-semibold">{pilgrim.full_name}</span> from this
                                group? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setShowRemoveConfirm(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleRemovePilgrim(pilgrim._id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          {mapUsers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No location data available for pilgrims in this group
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Group Location Map</CardTitle>
                <CardDescription>
                  Real-time location tracking for {mapUsers.length} pilgrim
                  {mapUsers.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GroupMap
                  users={mapUsers}
                  suggestedAreas={suggestedAreas}
                  onUserMarkerClick={handleViewProfile}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <PilgrimProfileDialog
        pilgrim={selectedPilgrim}
        open={showPilgrimDialog}
        onOpenChange={setShowPilgrimDialog}
      />
    </div>
  )
}
