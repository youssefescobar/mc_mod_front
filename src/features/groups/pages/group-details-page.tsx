import {
  ArrowRight,
  BellRing,
  Copy,
  Mail,
  MapPinned,
  MessageSquare,
  Share2,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShareGroupCodeDialog } from '@/features/groups/components/share-group-code-dialog'
import { useI18n } from '@/i18n/use-i18n'
import { getGroupDetails } from '@/services/api/groups-api'
import type { GroupDetails } from '@/types/groups'

export function GroupDetailsPage() {
  const { groupId = '' } = useParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
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

  const actionItems = [
    {
      title: 'Pilgrim Management',
      description: 'Manage pilgrims and roster actions.',
      to: `/app/groups/${group._id}/pilgrims`,
      icon: Users,
    },
    {
      title: 'Group Map',
      description: 'Track live locations and places.',
      to: `/app/groups/${group._id}/map`,
      icon: MapPinned,
    },
    {
      title: 'Invitations',
      description: 'Send and track invitations.',
      to: `/app/groups/${group._id}/invitations`,
      icon: Mail,
    },
    {
      title: 'Group Chat',
      description: 'Open group conversation.',
      to: `/app/groups/${group._id}/chat`,
      icon: MessageSquare,
    },
    {
      title: 'Reminders',
      description: 'Schedule and manage reminders.',
      to: `/app/groups/${group._id}/reminders`,
      icon: BellRing,
    },
  ]

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.group_code)
      setCopyStatus('Code copied')
      setTimeout(() => setCopyStatus(null), 1200)
    } catch {
      setCopyStatus('Copy failed')
      setTimeout(() => setCopyStatus(null), 1200)
    }
  }

  return (
    <div>
      <PageHeader
        title={group.group_name}
        description="Group tools in one compact view."
        action={
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('group.code')}</span>
              <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs font-semibold tracking-[0.1em] text-foreground">
                {group.group_code}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" type="button" variant="secondary" onClick={() => void onCopyCode()}>
                <Copy className="mr-1.5 size-3.5" />
                Copy
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setIsShareOpen(true)}>
                <Share2 className="mr-1.5 size-3.5" />
                Share
              </Button>
            </div>
            {copyStatus ? <span className="text-xs text-muted-foreground">{copyStatus}</span> : null}
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('group.pilgrims')}</CardTitle>
            <CardDescription>Total assigned pilgrims.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-5xl font-bold leading-none">{pilgrims.length}</CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('group.moderators')}</CardTitle>
            <CardDescription>Assigned moderators.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-5xl font-bold leading-none">
            {group.moderator_ids?.length ?? 0}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {actionItems.map((item) => {
          const Icon = item.icon

          return (
            <Link key={item.title} to={item.to}>
              <Card className="h-full border-border/80 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className="size-4 text-primary" />
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ArrowRight className="ml-3 size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <ShareGroupCodeDialog
        groupId={group._id}
        groupName={group.group_name}
        groupCode={group.group_code}
        moderatorName={leadModerator}
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        hideTrigger
      />
    </div>
  )
}
