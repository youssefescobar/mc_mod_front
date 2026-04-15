import { ArrowLeft, BellRing, CalendarClock, Check, Repeat2, SendHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n/use-i18n'
import { getGroupsDashboard } from '@/services/api/groups-api'
import {
  cancelReminder,
  createReminder,
  deleteReminder,
  getReminders,
} from '@/services/api/reminders-api'
import type { GroupSummary } from '@/types/groups'
import type { ReminderItem } from '@/types/notifications'

export function RemindersPage() {
  const { groupId: routeGroupId = '' } = useParams()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [targetType, setTargetType] = useState<'all' | 'group'>('group')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatInterval, setRepeatInterval] = useState(15)
  const [isDaily, setIsDaily] = useState(false)
  const [timesPerDay, setTimesPerDay] = useState(1)
  const [items, setItems] = useState<ReminderItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    open: boolean
    type: 'success' | 'error'
    title: string
    message: string
  }>({ open: false, type: 'success', title: '', message: '' })
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; itemId: string | null }>({
    open: false,
    itemId: null,
  })
  const loadGroupsSeqRef = useRef(0)
  const loadRemindersSeqRef = useRef(0)
  const { t } = useI18n()

  const reminderItems = Array.isArray(items) ? items : []
  const activeGroup = groups.find((group) => group._id === routeGroupId)

  const getStatusTone = (status: string) => {
    if (status === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (status === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (status === 'cancelled') return 'bg-rose-100 text-rose-700 border-rose-200'
    return 'bg-muted text-muted-foreground border-border'
  }

  useEffect(() => {
    const controller = new AbortController()
    const requestSeq = ++loadGroupsSeqRef.current

    const loadGroups = async () => {
      try {
        const data = await getGroupsDashboard(controller.signal)
        if (loadGroupsSeqRef.current !== requestSeq) return
        setGroups(data)
        if (routeGroupId) {
          setTargetType('group')
          setSelectedGroupIds([routeGroupId])
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
    const controller = new AbortController()
    const requestSeq = ++loadRemindersSeqRef.current

    const loadReminders = async () => {
      try {
        const data = await getReminders(routeGroupId || undefined, controller.signal)
        if (loadRemindersSeqRef.current !== requestSeq) return
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
  }, [routeGroupId])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (targetType === 'group' && selectedGroupIds.length === 0) return
    if (!text.trim() || !scheduledAt || isSubmitting) return

    setIsSubmitting(true)
    try {
      const payloadBase = {
        text,
        scheduled_at: new Date(scheduledAt).toISOString(),
        repeat_count: repeatCount,
        repeat_interval_min: repeatInterval,
        is_daily: isDaily,
        times_per_day: isDaily ? timesPerDay : undefined,
      }

      if (targetType === 'all') {
        await createReminder({
          ...payloadBase,
          target_type: 'system',
        })
      } else {
        await createReminder({
          ...payloadBase,
          group_ids: selectedGroupIds,
          target_type: 'group',
        })
      }

      setText('')
      setScheduledAt('')
      const requestSeq = ++loadRemindersSeqRef.current
      const data = await getReminders(routeGroupId || undefined)
      if (loadRemindersSeqRef.current !== requestSeq) return
      setItems(data)
      setSubmitStatus({
        open: true,
        type: 'success',
        title: 'Reminder Created',
        message: 'Your reminder has been scheduled successfully.',
      })
    } catch (error: unknown) {
      let message = 'Failed to create reminder. Please try again.'
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } }
        if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message
        }
      }
      setSubmitStatus({
        open: true,
        type: 'error',
        title: 'Error',
        message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const selectAllGroups = () => {
    setSelectedGroupIds((prev) => {
      if (prev.length === groups.length && groups.length > 0) {
        return []
      }
      return groups.map((g) => g._id)
    })
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
          routeGroupId ? (
            <Button asChild variant="outline" size="icon" aria-label="Back to group" title="Back to group">
              <Link to={`/app/groups/${routeGroupId}`}>
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
              <p className="text-sm text-muted-foreground">Write a short instruction and schedule it.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {!routeGroupId && (
              <div className="space-y-3 md:col-span-2">
                <Label>Target Audience</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={targetType === 'all' ? 'default' : 'outline'}
                    onClick={() => setTargetType('all')}
                    className="rounded-xl"
                  >
                    System Wide (All Groups)
                  </Button>
                  <Button
                    type="button"
                    variant={targetType === 'group' ? 'default' : 'outline'}
                    onClick={() => setTargetType('group')}
                    className="rounded-xl"
                  >
                    Specific Groups
                  </Button>
                </div>

                {targetType === 'group' && (
                  <div className="space-y-2 rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select Groups</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={selectAllGroups} className="h-7 text-xs">
                        {selectedGroupIds.length === groups.length && groups.length > 0 ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                      {groups.map((group) => (
                        <button
                          type="button"
                          key={group._id}
                          className={`flex items-center text-left gap-2 p-2 rounded-xl border transition-colors cursor-pointer ${
                            selectedGroupIds.includes(group._id)
                              ? 'bg-primary/5 border-primary'
                              : 'bg-muted/30 border-transparent hover:bg-muted/50'
                          }`}
                          onClick={() => toggleGroup(group._id)}
                        >
                          <div className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                            selectedGroupIds.includes(group._id)
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/30'
                          }`}>
                            {selectedGroupIds.includes(group._id) && <Check className="size-3" />}
                          </div>
                          <span className="text-sm truncate font-medium">{group.group_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {routeGroupId && (
               <div className="space-y-2 md:col-span-2">
               <Label>{t('reminders.group')}</Label>
               <Input
                 value={activeGroup?.group_name ?? 'Loading...'}
                 readOnly
                 className="h-11 rounded-2xl border-border bg-muted text-muted-foreground"
               />
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

            <div className="md:col-span-2 space-y-4 rounded-3xl border border-dashed border-border p-4 bg-muted/20">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="repeatDaily"
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={isDaily}
                  onChange={(e) => setIsDaily(e.target.checked)}
                />
                <Label htmlFor="repeatDaily" className="cursor-pointer font-medium">Repeat Daily</Label>
              </div>

              {isDaily && (
                <div className="space-y-2 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label>Times per day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={timesPerDay}
                    onChange={(e) => setTimesPerDay(Number(e.target.value))}
                    className="h-10 rounded-xl"
                    placeholder="E.g. 5 for prayers"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will repeat the sequence daily until cancelled.
                  </p>
                </div>
              )}
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

            <Button
              className="md:col-span-2 h-11 rounded-2xl"
              type="submit"
              disabled={isSubmitting || (targetType === 'group' && selectedGroupIds.length === 0) || !text.trim() || !scheduledAt}
            >
              <SendHorizontal className="mr-2 size-4" />
              {isSubmitting ? 'Creating...' : t('reminders.create')}
            </Button>
          </div>
        </form>

        <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Reminders List</h3>
            <Badge variant="secondary">{reminderItems.length}</Badge>
          </div>

          <div className="space-y-2.5 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-1">
            {reminderItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reminders.no_items')}</p>
            ) : null}

            {reminderItems.map((item) => (
              <article key={item._id} className="rounded-2xl border border-border/80 bg-card/95 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">
                      {item.target_type === 'system' || item.target_type === 'all_groups' ? 'System Wide' : `Group: ${groups.find(g => g._id === item.group_ids?.[0])?.group_name || 'Individual'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.is_daily && (
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        Daily ({item.times_per_day}x)
                      </Badge>
                    )}
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
                            const requestSeq = ++loadRemindersSeqRef.current
                            const data = await getReminders(routeGroupId || undefined)
                            if (loadRemindersSeqRef.current !== requestSeq) return
                            setItems(data)
                          } finally {
                            setIsCancellingId(null)
                          }
                        }}
                      >
                        {t('reminders.cancel')}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={isDeletingId === item._id}
                      onClick={() => setDeleteConfirm({ open: true, itemId: item._id })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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

      <Dialog open={submitStatus.open} onOpenChange={(open) => setSubmitStatus((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={submitStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}>
              {submitStatus.title}
            </DialogTitle>
            <DialogDescription>{submitStatus.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              onClick={() => setSubmitStatus((prev) => ({ ...prev, open: false }))}
              className={submitStatus.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {submitStatus.type === 'success' ? 'Great!' : 'OK'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, itemId: open ? deleteConfirm.itemId : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Reminder?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this reminder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, itemId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeletingId !== null}
              onClick={async () => {
                if (!deleteConfirm.itemId || isDeletingId) return
                setIsDeletingId(deleteConfirm.itemId)
                try {
                  await deleteReminder(deleteConfirm.itemId)
                  const requestSeq = ++loadRemindersSeqRef.current
                  const data = await getReminders(routeGroupId || undefined)
                  if (loadRemindersSeqRef.current !== requestSeq) return
                  setItems(data)
                } finally {
                  setIsDeletingId(null)
                  setDeleteConfirm({ open: false, itemId: null })
                }
              }}
            >
              {isDeletingId ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
