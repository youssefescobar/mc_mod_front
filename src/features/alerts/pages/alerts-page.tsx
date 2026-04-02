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
import { getNotifications } from '@/services/api/notifications-api'
import { useI18n } from '@/i18n/use-i18n'
import type { NotificationItem } from '@/types/notifications'

const ALERT_TYPES = new Set(['sos_alert', 'missed_call'])

export function AlertsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const { t } = useI18n()

  useEffect(() => {
    const load = async () => {
      const notifications = await getNotifications()
      setItems(notifications)
    }

    void load()
  }, [])

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
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
