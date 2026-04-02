import { Users, MapPinned, Mail, MessageSquare, BellRing } from 'lucide-react'
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
import { ShareGroupCodeDialog } from '@/features/groups/components/share-group-code-dialog'
import { useI18n } from '@/i18n/use-i18n'
import { getGroupDetails } from '@/services/api/groups-api'
import type { GroupDetails } from '@/types/groups'

export function GroupDetailsPage() {
  const { groupId = '' } = useParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (!groupId) return

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
        description="Group actions are split into dedicated pages for a cleaner workflow."
        action={<ShareGroupCodeDialog groupId={group._id} groupName={group.group_name} groupCode={group.group_code} moderatorName={leadModerator} />}
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
            <CardDescription>Total assigned pilgrims.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pilgrims.length}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('group.moderators')}</CardTitle>
            <CardDescription>Assigned moderators for this group.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {group.moderator_ids?.length ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Pilgrim Management
            </CardTitle>
            <CardDescription>
              Add single or bulk pilgrims, generate one-time login QR/token, and manage roster actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={`/app/groups/${group._id}/pilgrims`}>Open Pilgrim Workspace</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-5" />
              Group Map
            </CardTitle>
            <CardDescription>
              Dedicated live map for this group with locations, meetpoints, and suggested areas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={`/app/groups/${group._id}/map`}>Open Group Map</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5" />
              Invitations
            </CardTitle>
            <CardDescription>
              Send and track moderator invitations specifically for this group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={`/app/groups/${group._id}/invitations`}>Open Invitations</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Group Chat
            </CardTitle>
            <CardDescription>
              Open text chat workspace scoped to this group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={`/app/groups/${group._id}/chat`}>Open Group Chat</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-5" />
              Reminders
            </CardTitle>
            <CardDescription>
              Create and manage reminder schedule for this group only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={`/app/groups/${group._id}/reminders`}>Open Reminders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
