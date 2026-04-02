import { useEffect, useState } from 'react'

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
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/api/notifications-api'
import { useI18n } from '@/i18n/i18n-context'
import type { NotificationItem } from '@/types/notifications'

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const { t } = useI18n()

  const load = async () => {
    const data = await getNotifications()
    setItems(data)
  }

  useEffect(() => {
    void load()
  }, [])

  const unread = items.filter((item) => !item.read).length

  return (
    <div>
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.description')}
        action={
          <Button
            variant="outline"
            onClick={async () => {
              await markAllNotificationsRead()
              await load()
            }}
          >
            {t('notifications.mark_all_read')}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('notifications.inbox')}</CardTitle>
          <CardDescription>
            {unread} {t('notifications.unread_count')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  {!item.read ? <Badge>{t('notifications.unread')}</Badge> : <Badge variant="secondary">{t('notifications.read')}</Badge>}
                </div>
                {!item.read ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await markNotificationRead(item._id)
                      await load()
                    }}
                  >
                    {t('notifications.mark_read')}
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
