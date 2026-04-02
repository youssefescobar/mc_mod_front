import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/i18n/i18n-context'
import { getGroupDetails, getGroupsDashboard } from '@/services/api/groups-api'
import type { GroupSummary } from '@/types/groups'

interface MappedPilgrim {
  id: string
  name: string
  groupName: string
  lat: number
  lng: number
}

export function MapPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [mapped, setMapped] = useState<MappedPilgrim[]>([])
  const { t } = useI18n()

  useEffect(() => {
    const load = async () => {
      const dashboardGroups = await getGroupsDashboard()
      setGroups(dashboardGroups)

      const details = await Promise.all(
        dashboardGroups.map((group) => getGroupDetails(group._id)),
      )

      const flattened = details.flatMap((group) =>
        (group.pilgrims ?? [])
          .filter((pilgrim) => pilgrim.location)
          .map((pilgrim) => ({
            id: pilgrim._id,
            name: pilgrim.full_name,
            groupName: group.group_name,
            lat: pilgrim.location!.lat,
            lng: pilgrim.location!.lng,
          })),
      )

      setMapped(flattened)
    }

    void load()
  }, [])

  const title = useMemo(() => {
    return `${mapped.length} ${t('map.summary')} ${groups.length} ${t('map.group').toLowerCase()}`
  }, [groups.length, mapped.length])

  return (
    <div>
      <PageHeader
        title={t('map.title')}
        description={t('map.description')}
      />

      <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {title}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('map.pilgrim')}</TableHead>
              <TableHead>{t('map.group')}</TableHead>
              <TableHead>{t('map.coordinates')}</TableHead>
              <TableHead className="text-right">{t('map.open')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mapped.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.groupName}</TableCell>
                <TableCell>{item.lat.toFixed(5)}, {item.lng.toFixed(5)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open
                    </a>
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
