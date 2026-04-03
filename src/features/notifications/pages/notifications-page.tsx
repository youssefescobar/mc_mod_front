import { useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, Trash2 } from 'lucide-react'

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
  deleteNotification,
  deleteReadNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/api/notifications-api'
import { bindCommonRefreshEvents } from '@/services/realtime/common-events'
import { getRealtimeSocket } from '@/services/realtime/socket'
import { useAuth } from '@/features/auth/auth-context'
import { useI18n } from '@/i18n/use-i18n'
import type { NotificationItem } from '@/types/notifications'

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const isLoadingRef = useRef(false)
  const hasQueuedLoadRef = useRef(false)
  const { t } = useI18n()
  const { user } = useAuth()

  const load = async (signal?: AbortSignal, force = false) => {
    if (isLoadingRef.current) {
      hasQueuedLoadRef.current = true
      return
    }

    isLoadingRef.current = true
    try {
      do {
        hasQueuedLoadRef.current = false
        const data = await getNotifications({ signal, force })
        setItems(data)
      } while (hasQueuedLoadRef.current)
    } catch (error) {
      if (signal?.aborted) return
      console.error('Failed to load notifications', error)
    } finally {
      isLoadingRef.current = false
    }
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

    return () => {
      unbindCommonRefresh()
    }
  }, [user])

  const unread = items.filter((item) => !item.read).length

  return (
    <div>
      <PageHeader
        title={t('notifications.title')}
        description={t('notifications.description')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label={t('notifications.mark_all_read')}
              title={t('notifications.mark_all_read')}
              onClick={async () => {
                await markAllNotificationsRead()
                await load(undefined, true)
              }}
            >
              <CheckCheck className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Delete read notifications"
              title="Delete read notifications"
              onClick={async () => {
                await deleteReadNotifications()
                await load(undefined, true)
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={t('notifications.mark_read')}
                      title={t('notifications.mark_read')}
                      onClick={async () => {
                        await markNotificationRead(item._id)
                        await load(undefined, true)
                      }}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Delete notification"
                      title="Delete notification"
                      onClick={async () => {
                        await deleteNotification(item._id)
                        await load(undefined, true)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Delete notification"
                    title="Delete notification"
                    onClick={async () => {
                      await deleteNotification(item._id)
                      await load(undefined, true)
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
