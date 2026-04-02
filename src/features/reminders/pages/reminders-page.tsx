import { useEffect, useState, type FormEvent } from 'react'

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
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [groupId, setGroupId] = useState('')
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatInterval, setRepeatInterval] = useState(15)
  const [items, setItems] = useState<ReminderItem[]>([])
  const { t } = useI18n()

  const reminderItems = Array.isArray(items) ? items : []

  useEffect(() => {
    const loadGroups = async () => {
      const data = await getGroupsDashboard()
      setGroups(data)
      if (data.length > 0) {
        setGroupId((prev) => prev || data[0]._id)
      }
    }

    void loadGroups()
  }, [])

  useEffect(() => {
    if (!groupId) {
      return
    }

    const loadReminders = async () => {
      const data = await getReminders(groupId)
      setItems(data)
    }

    void loadReminders()
  }, [groupId])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
    const data = await getReminders(groupId)
    setItems(data)
  }

  return (
    <div>
      <PageHeader
        title={t('reminders.title')}
        description={t('reminders.description')}
      />

      <form onSubmit={onSubmit} className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('reminders.group')}</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <Label>{t('reminders.schedule')}</Label>
          <Input
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label>{t('reminders.text')}</Label>
          <Textarea
            required
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Example: Gather near Gate 3 in 15 minutes."
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
          />
        </div>

        <div className="space-y-2">
          <Label>{t('reminders.repeat_interval')}</Label>
          <Input
            type="number"
            min={1}
            value={repeatInterval}
            onChange={(event) => setRepeatInterval(Number(event.target.value))}
          />
        </div>

        <Button className="lg:col-span-2" type="submit">
          {t('reminders.create')}
        </Button>
      </form>

      <div className="space-y-3">
        {reminderItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('reminders.no_items')}</p>
        ) : null}

        {reminderItems.map((item) => (
          <article key={item._id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{item.text}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{item.status}</Badge>
                {item.status === 'pending' || item.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await cancelReminder(item._id)
                      const data = await getReminders(groupId)
                      setItems(data)
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
    </div>
  )
}
