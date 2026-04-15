import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, MailPlus, SendHorizontal, Users, X } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const loadSeqRef = useRef(0)
  const { t } = useI18n()

  const activeGroupId = routeGroupId || groupId
  const activeGroup = groups.find((group) => group._id === activeGroupId)

  const getStatusTone = (status: string) => {
    if (status === 'accepted') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (status === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (status === 'declined') return 'bg-rose-100 text-rose-700 border-rose-200'
    return 'bg-muted text-muted-foreground border-border'
  }

  const visibleItems = routeGroupId
    ? items.filter((item) => {
        const invitationGroupId =
          typeof item.group_id === 'object' ? item.group_id?._id : item.group_id
        return invitationGroupId === routeGroupId
      })
    : items

  const loadInvitations = async (signal?: AbortSignal) => {
    const requestSeq = ++loadSeqRef.current
    const data = await getInvitations(signal)
    if (loadSeqRef.current !== requestSeq) return
    setItems(data)
  }

  useEffect(() => {
    const controller = new AbortController()
    const requestSeq = ++loadSeqRef.current

    const load = async () => {
      try {
        const groupData = await getGroupsDashboard(controller.signal)
        if (loadSeqRef.current !== requestSeq) return
        setGroups(groupData)
        if (routeGroupId) {
          setGroupId(routeGroupId)
        } else if (groupData.length > 0) {
          setGroupId(groupData[0]._id)
        }
        await loadInvitations(controller.signal)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load invitations page data', error)
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [routeGroupId])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!groupId || !email.trim() || isSubmitting) return

    setIsSubmitting(true)
    setSubmitStatus(null)
    try {
      await sendGroupInvitation(groupId, email)
      setEmail('')
      setSubmitStatus({
        type: 'success',
        message: 'Invitation sent successfully! An email has been sent to the invitee.',
      })
      await loadInvitations()
    } catch (error: unknown) {
      let message = 'Failed to send invitation. Please try again.'

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string }; status?: number } }
        const backendMessage = axiosError.response?.data?.message

        if (backendMessage) {
          // Map specific backend messages to user-friendly ones
          if (backendMessage.includes('already a moderator')) {
            message = 'This user is already a moderator of this group.'
          } else if (backendMessage.includes('already a member')) {
            message = 'This user is already a member of this group.'
          } else if (backendMessage.includes('already pending')) {
            message = 'An invitation is already pending for this email address.'
          } else if (backendMessage.includes('Group not found')) {
            message = 'Group not found. Please refresh the page.'
          } else if (backendMessage.includes('Only group moderators')) {
            message = 'Only group moderators can send invitations.'
          } else {
            message = backendMessage
          }
        } else if (axiosError.response?.status === 404) {
          message = 'The requested resource was not found.'
        } else if (axiosError.response?.status === 403) {
          message = 'You do not have permission to send invitations.'
        }
      }

      setSubmitStatus({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('invitations.title')}
        description={
          routeGroupId
            ? `Manage invitations for ${activeGroup?.group_name ?? 'this group'}.`
            : t('invitations.description')
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

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="mb-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
              <MailPlus className="size-3.5" />
              Invitation Composer
            </p>
            <h3 className="mt-2.5 text-lg font-semibold text-foreground">Invite a moderator</h3>
            <p className="text-sm text-muted-foreground">Send invitation links to the right group and track responses.</p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            {routeGroupId ? (
              <div className="space-y-2 md:col-span-2">
                <Label>{t('invitations.group')}</Label>
                <Input
                  value={activeGroup?.group_name ?? 'Loading...'}
                  readOnly
                  className="h-11 rounded-2xl border-border bg-muted text-muted-foreground"
                />
              </div>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label>{t('invitations.group')}</Label>
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
              <Label>{t('invitations.email')}</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="moderator@example.com"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Users className="size-4" />
                Total invitations: {visibleItems.length}
              </span>
              <Badge variant="secondary">
                {visibleItems.filter((item) => item.status === 'pending').length} pending
              </Badge>
            </div>

            {submitStatus && (
              <Alert
                className={`md:col-span-2 ${
                  submitStatus.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                {submitStatus.type === 'success' ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="size-4 text-red-600" />
                )}
                <AlertTitle className="flex items-center justify-between">
                  {submitStatus.type === 'success' ? 'Success' : 'Error'}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 -mt-2 size-6 hover:bg-transparent"
                    onClick={() => setSubmitStatus(null)}
                  >
                    <X className="size-3" />
                  </Button>
                </AlertTitle>
                <AlertDescription>{submitStatus.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="md:col-span-2 h-11 rounded-2xl" disabled={isSubmitting || !groupId || !email.trim()}>
              <SendHorizontal className="mr-2 size-4" />
              {isSubmitting ? 'Sending...' : t('invitations.send')}
            </Button>
          </form>
        </section>

        <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm xl:sticky xl:top-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Invitation Activity</h3>
            <Badge variant="secondary">{visibleItems.length}</Badge>
          </div>

          <div className="space-y-2.5 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-1">
            {visibleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('invitations.no_items')}</p>
            ) : null}

            {visibleItems.map((item) => (
              <article key={item._id} className="rounded-2xl border border-border/80 bg-card/95 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.invitee_email}</p>
                    <p className="text-xs text-muted-foreground">
                      Group: {typeof item.group_id === 'object' ? item.group_id.group_name : 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border ${getStatusTone(item.status)}`}>{item.status}</Badge>
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
        </section>
      </div>
    </div>
  )
}
