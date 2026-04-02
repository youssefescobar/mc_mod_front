import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getGroupsDashboard } from '@/services/api/groups-api'
import {
  getGroupMessages,
  sendGroupTextMessage,
  type MessageItem,
} from '@/services/api/messages-api'
import type { GroupSummary } from '@/types/groups'

export function GroupChatPage() {
  const { groupId: routeGroupId = '' } = useParams()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [groupId, setGroupId] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [content, setContent] = useState('')

  const activeGroupId = routeGroupId || groupId
  const activeGroup = groups.find((group) => group._id === activeGroupId)

  useEffect(() => {
    const loadGroups = async () => {
      const data = await getGroupsDashboard()
      setGroups(data)
      if (routeGroupId) {
        setGroupId(routeGroupId)
      } else if (data.length > 0) {
        setGroupId((prev) => prev || data[0]._id)
      }
    }

    void loadGroups()
  }, [routeGroupId])

  useEffect(() => {
    if (!groupId) {
      return
    }

    const loadMessages = async () => {
      const data = await getGroupMessages(groupId)
      setMessages(data)
    }

    void loadMessages()
  }, [groupId])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendGroupTextMessage({ group_id: groupId, content })
    setContent('')
    const data = await getGroupMessages(groupId)
    setMessages(data)
  }

  return (
    <div>
      <PageHeader
        title="Group Chat"
        description={
          routeGroupId
            ? `Text chat for ${activeGroup?.group_name ?? 'this group'}.`
            : 'Text-only messaging for moderator web dashboard (voice/image excluded in this phase).'
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {routeGroupId ? (
          <div className="w-[280px] rounded-md border border-border bg-card px-3 py-2 text-sm">
            {activeGroup?.group_name ?? 'Loading group...'}
          </div>
        ) : (
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group._id} value={group._id}>
                  {group.group_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {groupId ? (
          <Button asChild variant="outline">
            <Link to={`/app/groups/${groupId}`}>Open group details</Link>
          </Button>
        ) : null}
      </div>

      <div className="mb-4 max-h-[420px] space-y-3 overflow-auto rounded-2xl border border-border bg-card p-4">
        {messages.map((message) => (
          <article key={message._id} className="rounded-xl border border-border p-3">
            <p className="text-sm">{message.content || '[non-text message]'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleString()}
            </p>
          </article>
        ))}
      </div>

      <form className="flex gap-2" onSubmit={onSubmit}>
        <Input
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Send a text message to the selected group"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  )
}
