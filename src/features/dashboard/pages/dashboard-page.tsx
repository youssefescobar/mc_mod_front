import { Bell, MapPinned, TriangleAlert, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroupsDashboard } from '@/services/api/groups-api'
import { getNotifications, getUnreadCount } from '@/services/api/notifications-api'
import type { GroupSummary } from '@/types/groups'
import type { NotificationItem } from '@/types/notifications'
import { useI18n } from '@/i18n/i18n-context'

export function DashboardPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { t } = useI18n()

  useEffect(() => {
    const load = async () => {
      const [groupData, notificationData, unread] = await Promise.all([
        getGroupsDashboard(),
        getNotifications(),
        getUnreadCount(),
      ])
      setGroups(groupData)
      setNotifications(notificationData)
      setUnreadCount(unread)
    }

    void load()
  }, [])

  const totals = useMemo(() => {
    const pilgrims = groups.reduce((sum, group) => {
      const count = group.pilgrim_count ?? group.pilgrim_ids?.length ?? 0
      return sum + count
    }, 0)

    const sos = notifications.filter((item) => item.type === 'sos_alert').length

    return {
      groups: groups.length,
      pilgrims,
      sos,
      unread: unreadCount,
    }
  }, [groups, notifications, unreadCount])

  const latest = notifications.slice(0, 6)

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} title={t('dashboard.managed_groups')} value={totals.groups.toString()} />
        <StatCard icon={MapPinned} title={t('dashboard.tracked_pilgrims')} value={totals.pilgrims.toString()} />
        <StatCard icon={TriangleAlert} title={t('dashboard.sos_alerts')} value={totals.sos.toString()} />
        <StatCard icon={Bell} title={t('dashboard.unread_notifications')} value={totals.unread.toString()} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.groups_snapshot')}</CardTitle>
            <CardDescription>{t('dashboard.groups_snapshot_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.no_groups')}</p>
            ) : (
              groups.map((group) => (
                <div key={group._id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{group.group_name}</p>
                    <Badge variant="secondary">{group.group_code}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('dashboard.pilgrims')}: {group.pilgrim_count ?? group.pilgrim_ids?.length ?? 0}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.recent_notifications')}</CardTitle>
            <CardDescription>{t('dashboard.recent_notifications_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latest.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.no_notifications')}</p>
            ) : (
              latest.map((item) => (
                <div key={item._id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {!item.read ? <Badge>{t('dashboard.unread')}</Badge> : <Badge variant="secondary">{t('dashboard.read')}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}
