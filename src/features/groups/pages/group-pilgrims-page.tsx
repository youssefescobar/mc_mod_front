import { Plus, Upload, AlertCircle, Copy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PilgrimProfileDialog } from '@/features/groups/components/pilgrim-profile-dialog'
import { UserActionMenu } from '@/features/groups/components/user-action-menu'
import {
  getGroupDetails,
  provisionPilgrim,
  provisionPilgrimsBulk,
  removePilgrimFromGroup,
} from '@/services/api/groups-api'
import type { GroupDetails } from '@/types/groups'
import type { UserMarker } from '@/types/map'
import type { ProvisionPilgrimInput, ProvisionPilgrimResult } from '@/types/pilgrims'

const ETHNICITIES: NonNullable<ProvisionPilgrimInput['ethnicity']>[] = [
  'Arab',
  'South Asian',
  'Turkic',
  'Persian',
  'Malay/Indonesian',
  'African',
  'Kurdish',
  'Berber',
  'European Muslim',
  'Other',
]

const VISA_STATUSES: NonNullable<NonNullable<ProvisionPilgrimInput['visa']>['status']>[] = [
  'pending',
  'issued',
  'rejected',
  'expired',
  'unknown',
]

export function GroupPilgrimsPage() {
  const { groupId = '' } = useParams()
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [selectedPilgrim, setSelectedPilgrim] = useState<UserMarker | null>(null)
  const [showPilgrimDialog, setShowPilgrimDialog] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProvisioningOne, setIsProvisioningOne] = useState(false)
  const [isProvisioningBulk, setIsProvisioningBulk] = useState(false)
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const [provisioned, setProvisioned] = useState<ProvisionPilgrimResult[]>([])
  const [form, setForm] = useState<ProvisionPilgrimInput>({
    full_name: '',
    phone_number: '',
    language: 'en',
    ethnicity: 'Other',
    visa: { status: 'unknown' },
  })

  const load = useCallback(async () => {
    if (!groupId) return
    try {
      const groupData = await getGroupDetails(groupId)
      setGroup(groupData)
    } catch (error) {
      console.error('Failed to load group data:', error)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    void load()
  }, [load])

  const handleViewProfile = (pilgrimId: string) => {
    const pilgrim = group?.pilgrims?.find((p) => p._id === pilgrimId)
    if (!pilgrim) return

    setSelectedPilgrim({
      _id: pilgrim._id,
      full_name: pilgrim.full_name,
      phone_number: pilgrim.phone_number,
      national_id: pilgrim.national_id,
      location: pilgrim.location || { lat: 0, lng: 0 },
      battery_percent: pilgrim.battery_percent,
      is_online: pilgrim.is_online || false,
      last_active_at: pilgrim.last_active_at || undefined,
    })
    setShowPilgrimDialog(true)
  }

  const handleRemovePilgrim = async (pilgrimId: string) => {
    try {
      await removePilgrimFromGroup(groupId, pilgrimId)
      setGroup((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          pilgrims: prev.pilgrims?.filter((p) => p._id !== pilgrimId),
        }
      })
      setShowRemoveConfirm(null)
    } catch (error) {
      console.error('Failed to remove pilgrim:', error)
    }
  }

  const onProvisionOne = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!groupId) return

    setIsProvisioningOne(true)
    try {
      const result = await provisionPilgrim(groupId, form)
      setProvisioned((prev) => [result, ...prev])
      setForm({
        full_name: '',
        phone_number: '',
        language: 'en',
        ethnicity: 'Other',
        visa: { status: 'unknown' },
      })
      await load()
    } catch (error) {
      console.error('Provision pilgrim failed', error)
    } finally {
      setIsProvisioningOne(false)
    }
  }

  const parseExcelRows = async (file: File): Promise<ProvisionPilgrimInput[]> => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      raw: false,
      defval: '',
    })

    return rows.map((row) => {
      const visa_status = String(row.visa_status || '').trim()
      return {
        full_name: String(row.full_name || '').trim(),
        phone_number: String(row.phone_number || '').trim(),
        national_id: String(row.national_id || '').trim() || undefined,
        email: String(row.email || '').trim() || undefined,
        age: row.age ? Number(row.age) : undefined,
        gender: (String(row.gender || '').trim() as 'male' | 'female' | 'other') || undefined,
        language: (String(row.language || '').trim() as ProvisionPilgrimInput['language']) || 'en',
        room_number: String(row.room_number || '').trim() || undefined,
        bus_info: String(row.bus_info || '').trim() || undefined,
        hotel_name: String(row.hotel_name || '').trim() || undefined,
        ethnicity: (String(row.ethnicity || '').trim() as ProvisionPilgrimInput['ethnicity']) || 'Other',
        medical_history: String(row.medical_history || '').trim() || undefined,
        visa: {
          visa_number: String(row.visa_number || '').trim() || undefined,
          issue_date: String(row.visa_issue_date || '').trim() || undefined,
          expiry_date: String(row.visa_expiry_date || '').trim() || undefined,
          status: (visa_status as NonNullable<NonNullable<ProvisionPilgrimInput['visa']>['status']>) || 'unknown',
        },
      }
    })
  }

  const onBulkFileChange = async (file?: File | null) => {
    if (!groupId || !file) return

    setIsProvisioningBulk(true)
    setBulkErrors([])
    try {
      const parsedRows = await parseExcelRows(file)
      const result = await provisionPilgrimsBulk(groupId, parsedRows)
      setProvisioned((prev) => [...result.created, ...prev])
      setBulkErrors(result.skipped.map((item) => `Row ${item.row}: ${item.reason}`))
      await load()
    } catch (error) {
      console.error('Bulk provision failed', error)
      setBulkErrors(['Bulk upload failed. Verify columns and file format.'])
    } finally {
      setIsProvisioningBulk(false)
    }
  }

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
    } catch (error) {
      console.error('Copy failed', error)
    }
  }

  const provisionedPreview = useMemo(() => provisioned.slice(0, 15), [provisioned])

  if (loading) return <p className="text-sm text-muted-foreground">Loading group pilgrims...</p>
  if (!group) return <p className="text-sm text-muted-foreground">Group not found</p>

  const pilgrims = group.pilgrims ?? []

  return (
    <div>
      <PageHeader
        title={`${group.group_name} - Pilgrims`}
        description="Create pilgrims one-by-one or in bulk, then share one-time QR login tokens."
        action={
          <Button asChild variant="outline">
            <Link to={`/app/groups/${group._id}`}>Back to Group</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Create Pilgrim Accounts</CardTitle>
          <CardDescription>
            Moderator-provisioned flow with one-time QR login (24h, single-use, device-bound).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={onProvisionOne} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Full name</Label>
              <Input required value={form.full_name || ''} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Phone number</Label>
              <Input required value={form.phone_number || ''} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Age</Label>
              <Input type="number" value={form.age ?? ''} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div className="space-y-1">
              <Label>Room number</Label>
              <Input value={form.room_number || ''} onChange={(e) => setForm((p) => ({ ...p, room_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Bus info</Label>
              <Input value={form.bus_info || ''} onChange={(e) => setForm((p) => ({ ...p, bus_info: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Hotel name</Label>
              <Input value={form.hotel_name || ''} onChange={(e) => setForm((p) => ({ ...p, hotel_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Language</Label>
              <Select value={form.language || 'en'} onValueChange={(value) => setForm((p) => ({ ...p, language: value as ProvisionPilgrimInput['language'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="ur">Urdu</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="id">Bahasa</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ethnicity</Label>
              <Select value={form.ethnicity || 'Other'} onValueChange={(value) => setForm((p) => ({ ...p, ethnicity: value as ProvisionPilgrimInput['ethnicity'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ETHNICITIES.map((item) => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visa status</Label>
              <Select value={form.visa?.status || 'unknown'} onValueChange={(value) => setForm((p) => ({ ...p, visa: { ...(p.visa || {}), status: value as NonNullable<NonNullable<ProvisionPilgrimInput['visa']>['status']> } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISA_STATUSES.map((item) => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <Button type="submit" disabled={isProvisioningOne}><Plus className="mr-2 size-4" />{isProvisioningOne ? 'Creating...' : 'Create pilgrim'}</Button>
              <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <Upload className="size-4" />
                {isProvisioningBulk ? 'Uploading...' : 'Upload Excel (.xlsx)'}
                <input className="hidden" type="file" accept=".xlsx,.xls" onChange={(e) => void onBulkFileChange(e.target.files?.[0])} disabled={isProvisioningBulk} />
              </Label>
            </div>
          </form>

          {bulkErrors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4">{bulkErrors.slice(0, 8).map((error) => (<li key={error}>{error}</li>))}</ul>
              </AlertDescription>
            </Alert>
          )}

          {provisionedPreview.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Latest one-time login credentials</p>
              <div className="grid gap-3 md:grid-cols-2">
                {provisionedPreview.map((item, index) => (
                  <div key={`${item.pilgrim._id}-${index}`} className="rounded-xl border p-3">
                    <p className="font-medium">{item.pilgrim.full_name}</p>
                    <p className="text-xs text-muted-foreground">{item.pilgrim.phone_number}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Input readOnly value={item.one_time_login.token} className="text-xs" />
                      <Button variant="outline" size="icon" onClick={() => void copyToken(item.one_time_login.token)}>
                        <Copy className="size-4" />
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Expires: {new Date(item.one_time_login.expires_at).toLocaleString()}</p>
                    <img src={item.one_time_login.qr_code_data_url} alt="One-time login QR" className="mt-2 h-28 w-28 rounded border" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pilgrim</TableHead>
              <TableHead>National ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-12">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pilgrims.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No pilgrims in this group yet</TableCell></TableRow>
            ) : pilgrims.map((pilgrim) => (
              <TableRow key={pilgrim._id}>
                <TableCell className="font-medium">{pilgrim.full_name}</TableCell>
                <TableCell>{pilgrim.national_id ?? '-'}</TableCell>
                <TableCell>{pilgrim.phone_number ?? '-'}</TableCell>
                <TableCell>{pilgrim.battery_percent ?? '-'}</TableCell>
                <TableCell>{pilgrim.is_online ? <Badge>Online</Badge> : <Badge variant="secondary">Offline</Badge>}</TableCell>
                <TableCell>{pilgrim.location ? `${pilgrim.location.lat.toFixed(5)}, ${pilgrim.location.lng.toFixed(5)}` : '-'}</TableCell>
                <TableCell>
                  <Dialog open={showRemoveConfirm === pilgrim._id} onOpenChange={(open) => setShowRemoveConfirm(open ? pilgrim._id : null)}>
                    <UserActionMenu
                      user={{
                        _id: pilgrim._id,
                        full_name: pilgrim.full_name,
                        phone_number: pilgrim.phone_number,
                        national_id: pilgrim.national_id,
                        location: pilgrim.location || { lat: 0, lng: 0 },
                        battery_percent: pilgrim.battery_percent,
                        is_online: pilgrim.is_online || false,
                        last_active_at: pilgrim.last_active_at || undefined,
                      }}
                      onViewProfile={handleViewProfile}
                      onRemove={() => setShowRemoveConfirm(pilgrim._id)}
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Removal</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to remove <span className="font-semibold">{pilgrim.full_name}</span> from this group?
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowRemoveConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => void handleRemovePilgrim(pilgrim._id)}>Remove</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PilgrimProfileDialog pilgrim={selectedPilgrim} open={showPilgrimDialog} onOpenChange={setShowPilgrimDialog} />
    </div>
  )
}
