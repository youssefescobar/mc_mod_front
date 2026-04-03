import { ArrowLeft, BellRing, CalendarClock, Repeat2, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n/use-i18n'
import { getGroupsDashboard } from '@/services/api/groups-api'
import {
  cancelReminder,
  createReminder,
  getReminders,
} from '@/services/api/reminders-api'
import type { GroupSummary } from '@/types/groups'
import type { ReminderItem } from '@/types/notifications'

export function RemindersPage() {
  const { groupId: routeGroupId = '' } = useParams()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [groupId, setGroupId] = useState('')
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatInterval, setRepeatInterval] = useState(15)
  const [items, setItems] = useState<ReminderItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null)
  const loadSeqRef = useRef(0)
  const { t } = useI18n()

  const reminderItems = Array.isArray(items) ? items : []
  const activeGroupId = routeGroupId || groupId
  const activeGroup = groups.find((group) => group._id === activeGroupId)

  const getStatusTone = (status: string) => {
    if (status === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (status === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (status === 'cancelled') return 'bg-rose-100 text-rose-700 border-rose-200'
    return 'bg-muted text-muted-foreground border-border'
  }

  useEffect(() => {
    const controller = new AbortController()
    const requestSeq = ++loadSeqRef.current

    const loadGroups = async () => {
      try {
        const data = await getGroupsDashboard(controller.signal)
        if (loadSeqRef.current !== requestSeq) return
        setGroups(data)
        if (routeGroupId) {
          setGroupId(routeGroupId)
        } else if (data.length > 0) {
          setGroupId((prev) => prev || data[0]._id)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load reminders groups', error)
      }
    }

    void loadGroups()

    return () => {
      controller.abort()
    }
  }, [routeGroupId])

  useEffect(() => {
    if (!groupId) {
      return
    }

    const controller = new AbortController()
    const requestSeq = ++loadSeqRef.current

    const loadReminders = async () => {
      try {
        const data = await getReminders(groupId, controller.signal)
        if (loadSeqRef.current !== requestSeq) return
        setItems(data)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load reminders', error)
      }
    }

    void loadReminders()

    return () => {
      controller.abort()
    }
  }, [groupId])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!groupId || !text.trim() || !scheduledAt || isSubmitting) return

    setIsSubmitting(true)
    try {
      await createReminder({
        group_id: groupId,
        target_type: 'group',
        text,
        scheduled_at: new Date(scheduledAt).toISOString(),
        repeat_count: repeatCount,
        repeat_interval_min: repeatInterval,
      })
      setText('')
      setScheduledAt('')
      const requestSeq = ++loadSeqRef.current
      const data = await getReminders(groupId)
      if (loadSeqRef.current !== requestSeq) return
      setItems(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('reminders.title')}
        description={
          routeGroupId
            ? `Manage reminders for ${activeGroup?.group_name ?? 'this group'}.`
            : t('reminders.description')
        }
        action={
          activeGroupId ? (
            <Button asChild variant="outline" size="icon" aria-label="Back to group" title="Back to group">
              <Link to={`/app/groups/${activeGroupId}`}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <form onSubmit={onSubmit} className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
                <BellRing className="size-3.5" />
                Reminder Composer
              </p>
              <h3 className="mt-2.5 text-lg font-semibold text-foreground">Create a clear reminder</h3>
              <p className="text-sm text-muted-foreground">Write a short instruction and schedule it once.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {routeGroupId ? (
              <div className="space-y-2 md:col-span-2">
                <Label>{t('reminders.group')}</Label>
                <Input
                  value={activeGroup?.group_name ?? 'Loading...'}
                  readOnly
                  className="h-11 rounded-2xl border-border bg-muted text-muted-foreground"
                />
              </div>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label>{t('reminders.group')}</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder={t('groups.group')} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.group_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>{t('reminders.text')}</Label>
              <Textarea
                required
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Example: Meet beside Gate 3 after Maghrib prayer."
                className="min-h-32 rounded-2xl border border-border bg-background px-4 py-3"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('reminders.schedule')}</Label>
              <Input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('reminders.repeat_count')}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={repeatCount}
                onChange={(event) => setRepeatCount(Number(event.target.value))}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t('reminders.repeat_interval')}</Label>
              <Input
                type="number"
                min={1}
                value={repeatInterval}
                onChange={(event) => setRepeatInterval(Number(event.target.value))}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-2xl bg-muted/70 px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="size-4" />
                Scheduled reminders: {reminderItems.length}
              </span>
              <span className="inline-flex items-center gap-2">
                <Repeat2 className="size-4" />
                Repeats every {repeatInterval} min
              </span>
            </div>

            <Button className="md:col-span-2 h-11 rounded-2xl" type="submit" disabled={isSubmitting || !groupId || !text.trim() || !scheduledAt}>
              <SendHorizontal className="mr-2 size-4" />
              {isSubmitting ? 'Creating...' : t('reminders.create')}
            </Button>
          </div>
        </form>

        <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Created Reminders</h3>
            <Badge variant="secondary">{reminderItems.length}</Badge>
          </div>

          <div className="space-y-2.5 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-1">
            {reminderItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reminders.no_items')}</p>
            ) : null}

            {reminderItems.map((item) => (
              <article key={item._id} className="rounded-2xl border border-border/80 bg-card/95 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{item.text}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`border ${getStatusTone(item.status)}`}>{item.status}</Badge>
                    {item.status === 'pending' || item.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isCancellingId === item._id}
                        onClick={async () => {
                          if (isCancellingId) return
                          setIsCancellingId(item._id)
                          try {
                            await cancelReminder(item._id)
                            const requestSeq = ++loadSeqRef.current
                            const data = await getReminders(groupId)
                            if (loadSeqRef.current !== requestSeq) return
                            setItems(data)
                          } finally {
                            setIsCancellingId(null)
                          }
                        }}
                      >
                        {t('reminders.cancel')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('reminders.scheduled')}: {new Date(item.scheduled_at).toLocaleString()} | {t('reminders.repeats')}: {item.repeat_count}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
