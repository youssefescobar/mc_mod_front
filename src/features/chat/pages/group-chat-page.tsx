import { ArrowLeft, BellRing, ExternalLink, MessageSquareText, Radio, SendHorizontal, Trash2, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getGroupsDashboard } from '@/services/api/groups-api'
import { getRealtimeSocket } from '@/services/realtime/socket'
import {
  deleteMessage,
  getGroupMessages,
  sendGroupMessage,
  type MessageItem,
} from '@/services/api/messages-api'
import { useAuth } from '@/features/auth/auth-context'
import type { GroupSummary } from '@/types/groups'

type SendMode = 'text' | 'tts' | 'urgent_tts'

export function GroupChatPage() {
  const { groupId: routeGroupId = '' } = useParams()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [groupId, setGroupId] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [content, setContent] = useState('')
  const [sendMode, setSendMode] = useState<SendMode>('text')
  const [isSending, setIsSending] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesRequestSeqRef = useRef(0)
  const { user } = useAuth()

  const activeGroupId = routeGroupId || groupId
  const activeGroup = groups.find((group) => group._id === activeGroupId)

  const sortByCreatedAsc = (items: MessageItem[]) =>
    [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  useEffect(() => {
    const controller = new AbortController()

    const loadGroups = async () => {
      try {
        const data = await getGroupsDashboard(controller.signal)
        setGroups(data)
        if (routeGroupId) {
          setGroupId(routeGroupId)
        } else if (data.length > 0) {
          setGroupId((prev) => prev || data[0]._id)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load groups for chat', error)
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
    const requestSeq = ++messagesRequestSeqRef.current

    const loadMessages = async () => {
      try {
        const data = await getGroupMessages(groupId, controller.signal)
        if (messagesRequestSeqRef.current !== requestSeq) return
        setMessages(sortByCreatedAsc(data))
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load group messages', error)
      }
    }

    void loadMessages()

    return () => {
      controller.abort()
    }
  }, [groupId])

  useEffect(() => {
    if (!user || !groupId) return

    const socket = getRealtimeSocket(user)
    socket.emit('join_group', groupId)

    const onNewMessage = (message: MessageItem) => {
      if (message.group_id !== groupId) return
      setMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) return prev
        return sortByCreatedAsc([...prev, message])
      })
    }

    const onMessageDeleted = (payload: { message_id?: string; group_id?: string }) => {
      if (payload.group_id !== groupId || !payload.message_id) return
      setMessages((prev) => prev.filter((item) => item._id !== payload.message_id))
    }

    socket.on('new_message', onNewMessage)
    socket.on('message_deleted', onMessageDeleted)

    return () => {
      socket.emit('leave_group', groupId)
      socket.off('new_message', onNewMessage)
      socket.off('message_deleted', onMessageDeleted)
    }
  }, [user, groupId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!groupId || !content.trim() || isSending) return

    setIsSending(true)
    try {
      if (sendMode === 'text') {
        await sendGroupMessage({
          group_id: groupId,
          content: content.trim(),
          type: 'text',
          is_urgent: false,
        })
      } else if (sendMode === 'tts') {
        await sendGroupMessage({
          group_id: groupId,
          content: content.trim(),
          type: 'tts',
          is_urgent: false,
          original_text: content.trim(),
        })
      } else {
        await sendGroupMessage({
          group_id: groupId,
          content: content.trim(),
          type: 'tts',
          is_urgent: true,
          original_text: content.trim(),
        })
      }

      setContent('')
      const requestSeq = ++messagesRequestSeqRef.current
      const data = await getGroupMessages(groupId, undefined, true)
      if (messagesRequestSeqRef.current !== requestSeq) return
      setMessages(sortByCreatedAsc(data))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Group Chat"
        description={
          routeGroupId
            ? `Text chat for ${activeGroup?.group_name ?? 'this group'}.`
            : 'Send text, TTS, and urgent TTS messages to this group.'
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

      <div className="grid gap-4 xl:items-start xl:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/35 px-3 py-2.5">
            <div className="min-w-[240px]">
              {routeGroupId ? (
                <div className="h-10 rounded-xl border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
                  {activeGroup?.group_name ?? 'Loading group...'}
                </div>
              ) : (
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
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
            </div>

            {groupId ? (
              <Button asChild variant="outline" size="icon" className="size-10 rounded-xl" title="Open group details" aria-label="Open group details">
                <Link to={`/app/groups/${groupId}`}>
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="mb-4 max-h-[460px] space-y-2.5 overflow-auto rounded-2xl border border-border/70 bg-background/70 p-3">
            {messages.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground">
                No messages yet. Start the conversation.
              </div>
            ) : null}

            {messages.map((message) => (
              <article
                key={message._id}
                className={`rounded-2xl border p-3 ${message.is_urgent ? 'border-red-300/70 bg-red-50/80' : 'border-border/70 bg-card'}`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{message.type.toUpperCase()}</Badge>
                    {message.is_urgent ? <Badge variant="destructive">URGENT</Badge> : null}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete message"
                    title="Delete message"
                    disabled={deletingMessageId === message._id}
                    onClick={async () => {
                      if (deletingMessageId) return
                      setDeletingMessageId(message._id)
                      try {
                        await deleteMessage(message._id, groupId)
                        setMessages((prev) => prev.filter((item) => item._id !== message._id))
                      } catch (error) {
                        console.error('Failed to delete message', error)
                      } finally {
                        setDeletingMessageId(null)
                      }
                    }}
                    className="size-8 rounded-lg text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{message.content || '[non-text message]'}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="space-y-3 rounded-2xl border border-border/80 bg-card p-3" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Message</Label>
              <Textarea
                required
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-24 rounded-xl border-border bg-background"
                placeholder={
                  sendMode === 'text'
                    ? 'Send a text message to the selected group'
                    : sendMode === 'tts'
                      ? 'Send a TTS message to the selected group'
                      : 'Send an URGENT TTS message to the selected group'
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={sendMode === 'text' ? 'default' : 'outline'}
                onClick={() => setSendMode('text')}
                className="rounded-full"
              >
                <MessageSquareText className="mr-1.5 size-3.5" />
                Text
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sendMode === 'tts' ? 'default' : 'outline'}
                onClick={() => setSendMode('tts')}
                className="rounded-full"
              >
                <Volume2 className="mr-1.5 size-3.5" />
                TTS
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sendMode === 'urgent_tts' ? 'destructive' : 'outline'}
                onClick={() => setSendMode('urgent_tts')}
                className="rounded-full"
              >
                <BellRing className="mr-1.5 size-3.5" />
                Urgent TTS
              </Button>
              <div className="ml-auto">
                <Button type="submit" disabled={isSending || !content.trim()} className="rounded-xl">
                  <SendHorizontal className="mr-2 size-4" />
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </form>
        </section>

        <aside className="self-start rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Chat Overview</h3>
          <div className="mt-3 space-y-2.5">
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Group</p>
              <p className="mt-1 text-sm font-medium text-foreground">{activeGroup?.group_name ?? 'Not selected'}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Messages Loaded</p>
              <p className="mt-1 text-sm font-medium text-foreground">{messages.length}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Current Mode</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium capitalize text-foreground">
                <Radio className="size-3.5" />
                {sendMode === 'urgent_tts' ? 'Urgent TTS' : sendMode}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
