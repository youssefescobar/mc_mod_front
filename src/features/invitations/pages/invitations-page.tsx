import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'

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
import { useI18n } from '@/i18n/use-i18n'
import { getGroupsDashboard } from '@/services/api/groups-api'
import {
  acceptInvitation,
  declineInvitation,
  getInvitations,
  sendGroupInvitation,
} from '@/services/api/invitations-api'
import type { GroupSummary } from '@/types/groups'
import type { InvitationItem } from '@/types/notifications'

export function InvitationsPage() {
  const { groupId: routeGroupId = '' } = useParams()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [groupId, setGroupId] = useState('')
  const [email, setEmail] = useState('')
  const [items, setItems] = useState<InvitationItem[]>([])
  const { t } = useI18n()

  const activeGroupId = routeGroupId || groupId
  const activeGroup = groups.find((group) => group._id === activeGroupId)

  const visibleItems = routeGroupId
    ? items.filter((item) => {
        const invitationGroupId =
          typeof item.group_id === 'object' ? item.group_id?._id : item.group_id
        return invitationGroupId === routeGroupId
      })
    : items

  const loadInvitations = async () => {
    const data = await getInvitations()
    setItems(data)
  }

  useEffect(() => {
    const load = async () => {
      const groupData = await getGroupsDashboard()
      setGroups(groupData)
      if (routeGroupId) {
        setGroupId(routeGroupId)
      } else if (groupData.length > 0) {
        setGroupId(groupData[0]._id)
      }
      await loadInvitations()
    }

    void load()
  }, [routeGroupId])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendGroupInvitation(groupId, email)
    setEmail('')
    await loadInvitations()
  }

  return (
    <div>
      <PageHeader
        title={t('invitations.title')}
        description={
          routeGroupId
            ? `Manage invitations for ${activeGroup?.group_name ?? 'this group'}.`
            : t('invitations.description')
        }
      />

      <form onSubmit={onSubmit} className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 lg:grid-cols-3">
        {routeGroupId ? (
          <div className="space-y-2">
            <Label>{t('invitations.group')}</Label>
            <Input value={activeGroup?.group_name ?? 'Loading...'} readOnly />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t('invitations.group')}</Label>
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
        )}

        <div className="space-y-2 lg:col-span-2">
          <Label>{t('invitations.email')}</Label>
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="moderator@example.com"
          />
        </div>

        <Button type="submit" className="lg:col-span-3">
          {t('invitations.send')}
        </Button>
      </form>

      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('invitations.no_items')}</p>
        ) : null}

        {visibleItems.map((item) => (
          <article key={item._id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.invitee_email}</p>
                <p className="text-xs text-muted-foreground">
                  Group: {typeof item.group_id === 'object' ? item.group_id.group_name : 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{item.status}</Badge>
                {item.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await acceptInvitation(item._id)
                        await loadInvitations()
                      }}
                    >
                      {t('invitations.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await declineInvitation(item._id)
                        await loadInvitations()
                      }}
                    >
                      {t('invitations.decline')}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
