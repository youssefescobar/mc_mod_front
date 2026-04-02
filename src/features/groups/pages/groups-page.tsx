import { Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createGroup, getGroupsDashboard } from '@/services/api/groups-api'
import { useI18n } from '@/i18n/i18n-context'
import type { GroupSummary } from '@/types/groups'

export function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { t } = useI18n()

  const loadGroups = async () => {
    const data = await getGroupsDashboard()
    setGroups(data)
  }

  useEffect(() => {
    void loadGroups()
  }, [])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      await createGroup(groupName)
      setGroupName('')
      setIsOpen(false)
      await loadGroups()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('groups.title')}
        description={t('groups.description')}
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                {t('groups.create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('groups.create_title')}</DialogTitle>
                <DialogDescription>{t('groups.create_desc')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">{t('groups.name')}</Label>
                  <Input
                    id="groupName"
                    required
                    minLength={3}
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t('groups.creating') : t('groups.create_action')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('groups.group')}</TableHead>
              <TableHead>{t('groups.code')}</TableHead>
              <TableHead>{t('groups.pilgrims')}</TableHead>
              <TableHead>{t('groups.moderators')}</TableHead>
              <TableHead className="text-right">{t('groups.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group._id}>
                <TableCell className="font-medium">{group.group_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{group.group_code}</Badge>
                </TableCell>
                <TableCell>{group.pilgrim_count ?? group.pilgrim_ids?.length ?? 0}</TableCell>
                <TableCell>{group.moderator_ids?.length ?? 0}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/app/groups/${group._id}`}>{t('groups.open')}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
