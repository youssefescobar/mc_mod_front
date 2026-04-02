import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendIndividualTextMessage } from '@/services/api/messages-api'

export function IndividualChatPage() {
  const { groupId = '', recipientId = '' } = useParams()
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendIndividualTextMessage({
      group_id: groupId,
      recipient_id: recipientId,
      content,
    })
    setContent('')
    setStatus('Message sent successfully.')
  }

  return (
    <div>
      <PageHeader
        title="Individual Chat"
        description="Text-only direct message endpoint for moderator to pilgrim communication."
      />

      <form onSubmit={onSubmit} className="max-w-2xl space-y-3 rounded-2xl border border-border bg-card p-5">
        <Input value={groupId} disabled />
        <Input value={recipientId} disabled />
        <Input
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Type your message"
        />
        <Button type="submit">Send direct message</Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </form>
    </div>
  )
}
