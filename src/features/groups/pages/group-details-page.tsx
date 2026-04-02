import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ShareGroupCodeDialog } from '@/features/groups/components/share-group-code-dialog'
import { useI18n } from '@/i18n/i18n-context'
import { getGroupDetails } from '@/services/api/groups-api'
import type { GroupDetails } from '@/types/groups'

export function GroupDetailsPage() {
  const { groupId = '' } = useParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (!groupId) {
      return
    }

    const load = async () => {
      const data = await getGroupDetails(groupId)
      setGroup(data)
    }

    void load()
  }, [groupId])

  if (!group) {
    return <p className="text-sm text-muted-foreground">Loading group details...</p>
  }

  const pilgrims = group.pilgrims ?? []
  const leadModerator = group.moderator_ids?.[0]?.full_name

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

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('map.pilgrim')}</TableHead>
              <TableHead>{t('group.national_id')}</TableHead>
              <TableHead>{t('group.phone')}</TableHead>
              <TableHead>{t('group.battery')}</TableHead>
              <TableHead>{t('group.status')}</TableHead>
              <TableHead>{t('group.location')}</TableHead>
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
                  {pilgrim.is_online ? <Badge>{t('group.online')}</Badge> : <Badge variant="secondary">{t('group.offline')}</Badge>}
                </TableCell>
                <TableCell>
                  {pilgrim.location
                    ? `${pilgrim.location.lat.toFixed(5)}, ${pilgrim.location.lng.toFixed(5)}`
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
