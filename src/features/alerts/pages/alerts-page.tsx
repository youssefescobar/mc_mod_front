import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'

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
import { deleteNotification, getNotifications } from '@/services/api/notifications-api'
import { getGroupsDashboard } from '@/services/api/groups-api'
import { bindCommonRefreshEvents } from '@/services/realtime/common-events'
import { getRealtimeSocket } from '@/services/realtime/socket'
import { useAuth } from '@/features/auth/auth-context'
import { useI18n } from '@/i18n/use-i18n'
import type { NotificationItem } from '@/types/notifications'

const ALERT_TYPES = new Set(['sos_alert', 'missed_call'])

export function AlertsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const { t } = useI18n()
  const { user } = useAuth()

  const load = async (signal?: AbortSignal) => {
    const notifications = await getNotifications({ signal })
    setItems(notifications)
  }

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const socket = getRealtimeSocket(user)
    const refresh = () => {
      void load()
    }

    const unbindCommonRefresh = bindCommonRefreshEvents(socket, refresh)
    socket.on('sos-alert-received', refresh)

    const joinAllGroups = async () => {
      const groups = await getGroupsDashboard()
      groups.forEach((group) => {
        socket.emit('join_group', group._id)
      })
    }

    void joinAllGroups()

    return () => {
      unbindCommonRefresh()
      socket.off('sos-alert-received', refresh)
    }
  }, [user])

  const alerts = useMemo(
    () => items.filter((item) => ALERT_TYPES.has(item.type)),
    [items],
  )

  return (
    <div>
      <PageHeader
        title={t('alerts.title')}
        description={t('alerts.description')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('alerts.critical_activity')}</CardTitle>
          <CardDescription>{t('alerts.critical_activity_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('alerts.no_active')}</p>
          ) : (
            alerts.map((alert) => (
              <article key={alert._id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{alert.title}</h3>
                  {!alert.read ? <Badge>Unread</Badge> : <Badge variant="secondary">Read</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground/80">{new Date(alert.created_at).toLocaleString()}</p>
                <div className="mt-3">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Delete alert"
                    title="Delete alert"
                    onClick={async () => {
                      await deleteNotification(alert._id)
                      await load()
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
