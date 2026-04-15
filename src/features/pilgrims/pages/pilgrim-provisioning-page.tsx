import { AlertCircle, ChevronDown, Copy, Download, Plus, RefreshCw, Search, Share2, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import ExcelJS from 'exceljs'

import { PageHeader } from '@/components/layout/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import logo from '@/assets/logo.jpeg'
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
  getGroupProvisioningStatus,
  getGroupResourceOptions,
  getGroupsDashboard,
  deleteProvisionedPilgrim,
  reissueGroupPilgrimLogin,
  provisionPilgrim,
  provisionPilgrimsBulk,
  type GroupResourceOptionBus,
  type GroupResourceOptionHotel,
} from '@/services/api/groups-api'
import type { GroupSummary } from '@/types/groups'
import type {
  PilgrimProvisioningLifecycleItem,
  PilgrimProvisioningSummary,
  ProvisionPilgrimInput,
} from '@/types/pilgrims'

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

export function PilgrimProvisioningPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [resourceHotels, setResourceHotels] = useState<GroupResourceOptionHotel[]>([])
  const [resourceBuses, setResourceBuses] = useState<GroupResourceOptionBus[]>([])

  const [isProvisioningOne, setIsProvisioningOne] = useState(false)
  const [isProvisioningBulk, setIsProvisioningBulk] = useState(false)
  const [reissuingPilgrimId, setReissuingPilgrimId] = useState<string | null>(null)
  const [deletingPilgrimId, setDeletingPilgrimId] = useState<string | null>(null)
  const [selectedProvisioningItem, setSelectedProvisioningItem] = useState<PilgrimProvisioningLifecycleItem | null>(null)
  const [pendingDeleteItem, setPendingDeleteItem] = useState<PilgrimProvisioningLifecycleItem | null>(null)
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'activated' | 'expired'>('all')
  const [isExtraDetailsOpen, setIsExtraDetailsOpen] = useState(false)
  const [statusSummary, setStatusSummary] = useState<PilgrimProvisioningSummary>({
    total_provisioned: 0,
    pending_count: 0,
    activated_count: 0,
    expired_count: 0,
    pending_with_visible_token_count: 0,
  })
  const [provisioningItems, setProvisioningItems] = useState<PilgrimProvisioningLifecycleItem[]>([])

  const [form, setForm] = useState<ProvisionPilgrimInput>({
    full_name: '',
    phone_number: '',
    language: 'en',
    ethnicity: 'Other',
    visa: { status: 'unknown' },
  })

  // Country code selector state
  const [countryCode, setCountryCode] = useState<string>('+966')

  // New: error state for each field
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Validation rules
  const validateForm = (f: ProvisionPilgrimInput) => {
    const errors: Record<string, string> = {}
    if (!f.full_name || f.full_name.trim().length < 3 || f.full_name.length > 100) {
      errors.full_name = 'Full name must be 3-100 characters.'
    }
    if (!f.phone_number || f.phone_number.trim().length < 3 || f.phone_number.length > 30) {
      errors.phone_number = 'Phone number must be 3-30 characters.'
    }
    if (f.age !== undefined && (isNaN(f.age) || f.age < 0 || f.age > 120)) {
      errors.age = 'Age must be between 0 and 120.'
    }
    if (f.medical_history && f.medical_history.length > 500) {
      errors.medical_history = 'Medical history max 500 characters.'
    }
    return errors
  }

  useEffect(() => {
    const loadGroups = async () => {
      const result = await getGroupsDashboard()
      setGroups(result)
    }

    void loadGroups()
  }, [])

  const refreshProvisioningStatus = useCallback(async () => {
    if (!selectedGroupId) {
      setStatusSummary({
        total_provisioned: 0,
        pending_count: 0,
        activated_count: 0,
        expired_count: 0,
        pending_with_visible_token_count: 0,
      })
      setProvisioningItems([])
      return
    }

    try {
      const result = await getGroupProvisioningStatus(selectedGroupId)
      setStatusSummary(result.summary)
      setProvisioningItems(result.items)
    } catch (error) {
      console.error('Failed to load provisioning status', error)
      setStatusSummary({
        total_provisioned: 0,
        pending_count: 0,
        activated_count: 0,
        expired_count: 0,
        pending_with_visible_token_count: 0,
      })
      setProvisioningItems([])
    }
  }, [selectedGroupId])

  useEffect(() => {
    if (!selectedGroupId) {
      setResourceHotels([])
      setResourceBuses([])
      return
    }

    const loadResources = async () => {
      try {
        const [options] = await Promise.all([
          getGroupResourceOptions(selectedGroupId),
          refreshProvisioningStatus(),
        ])
        setResourceHotels(options.hotels)
        setResourceBuses(options.buses)
      } catch (error) {
        console.error('Failed to load group resources', error)
        setResourceHotels([])
        setResourceBuses([])
      }
    }

    void loadResources()
  }, [refreshProvisioningStatus, selectedGroupId])

  useEffect(() => {
    if (!selectedGroupId) return

    const timer = setInterval(() => {
      void refreshProvisioningStatus()
    }, 20000)

    return () => clearInterval(timer)
  }, [refreshProvisioningStatus, selectedGroupId])

  const selectedHotel = useMemo(
    () => resourceHotels.find((hotel) => hotel._id === form.hotel_id),
    [form.hotel_id, resourceHotels],
  )

  useEffect(() => {
    if (!selectedHotel) {
      setForm((prev) => ({ ...prev, room_id: undefined, room_number: undefined }))
      return
    }

    const roomExists = (selectedHotel.rooms || []).some((room) => room._id === form.room_id)
    if (!roomExists) {
      setForm((prev) => ({ ...prev, room_id: undefined, room_number: undefined }))
    }
  }, [form.room_id, selectedHotel])

  const onProvisionOne = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedGroupId) return

    setIsProvisioningOne(true)
    try {
      // Combine country code with phone number
      const fullPhoneNumber = form.phone_number ? `${countryCode}${form.phone_number}` : ''
      await provisionPilgrim(selectedGroupId, { ...form, phone_number: fullPhoneNumber })
      setForm({
        full_name: '',
        phone_number: '',
        language: 'en',
        ethnicity: 'Other',
        visa: { status: 'unknown' },
      })
      await refreshProvisioningStatus()
    } catch (error) {
      console.error('Provision pilgrim failed', error)
    } finally {
      setIsProvisioningOne(false)
    }
  }

  const parseExcelRows = async (file: File): Promise<ProvisionPilgrimInput[]> => {
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const worksheet = workbook.worksheets[0]
    
    const rows: Record<string, unknown>[] = []
    
    // Get headers from first row
    const headers: string[] = []
    const headerRow = worksheet.getRow(1)
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '')
    })

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // skip header
      const rowData: Record<string, unknown> = {}
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber]
        if (header) {
          // exceljs can return cell value as string, number, date, or object (rich text, formula, etc.)
          let value = cell.value
          if (value && typeof value === 'object' && 'result' in value) {
            value = (value as ExcelJS.CellFormulaValue).result
          }
          rowData[header] = value
        }
      })
      rows.push(rowData)
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
        room_id: String(row.room_id || '').trim() || undefined,
        bus_info: String(row.bus_info || '').trim() || undefined,
        bus_id: String(row.bus_id || '').trim() || undefined,
        hotel_name: String(row.hotel_name || '').trim() || undefined,
        hotel_id: String(row.hotel_id || '').trim() || undefined,
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
    if (!selectedGroupId || !file) return

    setIsProvisioningBulk(true)
    setBulkErrors([])
    try {
      const parsedRows = await parseExcelRows(file)
      const result = await provisionPilgrimsBulk(selectedGroupId, parsedRows)
      setBulkErrors(result.skipped.map((item) => `Row ${item.row}: ${item.reason}`))
      await refreshProvisioningStatus()
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

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })

  const buildSharableLoginCard = async (item: PilgrimProvisioningLifecycleItem) => {
    if (!item.one_time_login.qr_code_data_url || !item.one_time_login.token) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1500
    const context = canvas.getContext('2d')
    if (!context) return null

    const logoImage = await loadImage(logo)
    const qrImage = await loadImage(item.one_time_login.qr_code_data_url)

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, 220)

    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(540, 150, 72, 0, Math.PI * 2)
    context.fill()

    context.save()
    context.beginPath()
    context.arc(540, 150, 66, 0, Math.PI * 2)
    context.clip()
    context.drawImage(logoImage, 474, 84, 132, 132)
    context.restore()

    context.fillStyle = '#1a1a4e'
    context.font = '700 58px Inter, sans-serif'
    context.textAlign = 'center'
    context.fillText('Munawwara Care', 540, 290)

    context.fillStyle = '#64748b'
    context.font = '600 28px Inter, sans-serif'
    context.fillText('Scan to login', 540, 335)

    context.fillStyle = '#1a1a4e'
    context.font = '700 24px Inter, sans-serif'
    context.fillText('SCAN TO LOG IN', 540, 412)

    context.fillStyle = '#ffffff'
    context.strokeStyle = '#e8c97a'
    context.lineWidth = 10
    context.beginPath()
    context.roundRect(300, 446, 480, 480, 24)
    context.fill()
    context.stroke()

    context.drawImage(qrImage, 340, 486, 400, 400)

    context.fillStyle = '#64748b'
    context.font = '600 22px Inter, sans-serif'
    context.fillText('Pilgrim name', 540, 964)

    context.fillStyle = '#1a1a4e'
    context.font = '700 36px Inter, sans-serif'
    context.fillText(item.pilgrim.full_name, 540, 1006)

    context.fillStyle = '#64748b'
    context.font = '600 26px Inter, sans-serif'
    context.fillText('Or use login code', 540, 1074)

    context.fillStyle = '#f0f0f8'
    context.strokeStyle = '#e8c97a80'
    context.lineWidth = 2
    context.beginPath()
    context.roundRect(170, 1104, 740, 130, 20)
    context.fill()
    context.stroke()

    context.fillStyle = '#b0924a'
    context.font = '700 44px Inter, sans-serif'
    const code = item.one_time_login.token
    context.fillText(code, 540, 1186)

    context.fillStyle = '#dc2626'
    context.font = '700 24px Inter, sans-serif'
    context.fillText('Please do not share this code with anyone.', 540, 1328)

    context.fillStyle = '#f97316'
    context.font = '600 22px Inter, sans-serif'
    context.fillText('Download Munawwara Care to get started.', 540, 1382)

    context.textAlign = 'start'

    return canvas.toDataURL('image/png')
  }

  const shareToken = async (item: PilgrimProvisioningLifecycleItem) => {
    const token = item.one_time_login.token
    if (!token) return

    const shareText = `Pilgrim: ${item.pilgrim.full_name}\nPhone: ${item.pilgrim.phone_number}\nLogin code: ${token}`

    try {
      if (navigator.share) {
        const cardDataUrl = await buildSharableLoginCard(item)
        if (cardDataUrl) {
          const blob = await fetch(cardDataUrl).then((response) => response.blob())
          const file = new File([blob], `${item.pilgrim.full_name.replace(/\s+/g, '-').toLowerCase()}-login-card.png`, {
            type: 'image/png',
          })

          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: `Pilgrim login for ${item.pilgrim.full_name}`,
              text: shareText,
              files: [file],
            })
            return
          }
        }

        await navigator.share({
          title: `Pilgrim login for ${item.pilgrim.full_name}`,
          text: shareText,
        })
        return
      }

      await navigator.clipboard.writeText(shareText)
    } catch (error) {
      console.error('Share failed', error)
    }
  }

  const downloadTokenCard = async (item: PilgrimProvisioningLifecycleItem) => {
    try {
      const cardDataUrl = await buildSharableLoginCard(item)
      if (!cardDataUrl) return

      const safeName = item.pilgrim.full_name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'pilgrim'

      const link = document.createElement('a')
      link.href = cardDataUrl
      link.download = `${safeName}-login-code.png`
      link.click()
    } catch (error) {
      console.error('Download failed', error)
    }
  }

  const reissueCode = async (pilgrimId: string) => {
    if (!selectedGroupId) return

    setReissuingPilgrimId(pilgrimId)
    try {
      const result = await reissueGroupPilgrimLogin(selectedGroupId, pilgrimId)
      setProvisioningItems((prev) =>
        prev.map((item) =>
          item.pilgrim._id === pilgrimId
            ? {
                ...item,
                status: 'pending',
                one_time_login: {
                  token: result.one_time_login.token,
                  issued_at: new Date().toISOString(),
                  expires_at: result.one_time_login.expires_at,
                  used_at: null,
                  qr_code_data_url: result.one_time_login.qr_code_data_url,
                },
              }
            : item,
        ),
      )
      await refreshProvisioningStatus()
    } catch (error) {
      console.error('Failed to reissue pilgrim login', error)
    } finally {
      setReissuingPilgrimId(null)
    }
  }

  const deletePilgrimAccount = async (item: PilgrimProvisioningLifecycleItem) => {
    if (!selectedGroupId) return

    setDeletingPilgrimId(item.pilgrim._id)
    try {
      await deleteProvisionedPilgrim(selectedGroupId, item.pilgrim._id)
      if (selectedProvisioningItem?.pilgrim._id === item.pilgrim._id) {
        setSelectedProvisioningItem(null)
      }
      setPendingDeleteItem(null)
      await refreshProvisioningStatus()
    } catch (error) {
      console.error('Failed to delete pilgrim account', error)
    } finally {
      setDeletingPilgrimId(null)
    }
  }

  const selectedGroupName = useMemo(
    () => groups.find((group) => group._id === selectedGroupId)?.group_name || 'No group selected',
    [groups, selectedGroupId],
  )

  const filteredItems = useMemo(() => {
    let items = provisioningItems

    // Apply status filter
    if (statusFilter !== 'all') {
      items = items.filter((item) => item.status === statusFilter)
    }

    // Apply search query
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      items = items.filter((item) => {
        const haystack = [item.pilgrim.full_name, item.pilgrim.phone_number, item.one_time_login.token || '', item.status]
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
    }

    return items
  }, [provisioningItems, searchQuery, statusFilter])

  const formatDate = (value: string | null) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleString()
  }

  const getStatusClasses = (status: PilgrimProvisioningLifecycleItem['status']) => {
    if (status === 'activated') {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700'
    }
    if (status === 'expired') {
      return 'border-rose-300 bg-rose-50 text-rose-700'
    }
    return 'border-amber-300 bg-amber-50 text-amber-700'
  }

  return (
    <div>
      <PageHeader
        title="Pilgrim Provisioning"
        description="Create pilgrims, track activation live, and keep pending login codes/QRs visible until they are used."
      />

      <Card className="overflow-hidden border-border/70">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-5 lg:p-5">
          <div className="rounded-lg border border-border/70 bg-background/70 p-4 lg:col-span-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Active Group</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{selectedGroupName}</p>
            <p className="mt-2 text-sm text-muted-foreground">Monitor provisioning lifecycle from one view.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-3">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Total Provisioned</p>
              <p className="mt-1 text-2xl font-semibold">{statusSummary.total_provisioned}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-xs text-amber-700">Pending Activation</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{statusSummary.pending_count}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
              <p className="text-xs text-emerald-700">Activated</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{statusSummary.activated_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedProvisioningItem)} onOpenChange={(open) => !open && setSelectedProvisioningItem(null)}>
        <DialogContent className="max-w-[92vw] lg:max-w-5xl">
          <DialogHeader className="pr-20">
            <DialogTitle>{selectedProvisioningItem?.pilgrim.full_name}</DialogTitle>
            <DialogDescription>
              {selectedProvisioningItem?.pilgrim.phone_number} · {selectedProvisioningItem?.status}
            </DialogDescription>
            <div className="absolute top-4 right-12 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => selectedProvisioningItem && void reissueCode(selectedProvisioningItem.pilgrim._id)}
                disabled={!selectedProvisioningItem || reissuingPilgrimId === selectedProvisioningItem.pilgrim._id || selectedProvisioningItem.status === 'activated'}
                title="Refresh code"
              >
                <RefreshCw className={`size-4 ${selectedProvisioningItem && reissuingPilgrimId === selectedProvisioningItem.pilgrim._id ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh code</span>
              </Button>
            </div>
          </DialogHeader>

          {selectedProvisioningItem ? (
            <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`rounded-md border px-2 py-1 text-xs font-medium capitalize whitespace-nowrap ${getStatusClasses(selectedProvisioningItem.status)}`}>
                      {selectedProvisioningItem.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Issued</span>
                    <span className="whitespace-nowrap">{formatDate(selectedProvisioningItem.one_time_login.issued_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="whitespace-nowrap">{formatDate(selectedProvisioningItem.one_time_login.expires_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Activated At</span>
                    <span className="whitespace-nowrap">{formatDate(selectedProvisioningItem.one_time_login.used_at)}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 p-4">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Login Code</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input readOnly value={selectedProvisioningItem.one_time_login.token || ''} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => void copyToken(selectedProvisioningItem.one_time_login.token || '')} disabled={!selectedProvisioningItem.one_time_login.token}>
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => void shareToken(selectedProvisioningItem)} disabled={!selectedProvisioningItem.one_time_login.token}>
                      <Share2 className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => void downloadTokenCard(selectedProvisioningItem)} disabled={!selectedProvisioningItem.one_time_login.token}>
                      <Download className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="hidden" />
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border/70 bg-background p-4 text-center">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">QR Code</p>
                  {selectedProvisioningItem.one_time_login.qr_code_data_url ? (
                    <img
                      src={selectedProvisioningItem.one_time_login.qr_code_data_url}
                      alt={`QR code for ${selectedProvisioningItem.pilgrim.full_name}`}
                      className="mx-auto mt-3 h-64 w-64 rounded-lg border bg-white p-3 sm:h-72 sm:w-72"
                    />
                  ) : (
                    <div className="mt-3 flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground sm:h-72">
                      No QR available
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDeleteItem)} onOpenChange={(open) => !open && setPendingDeleteItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete pilgrim account?</DialogTitle>
            <DialogDescription>
              {pendingDeleteItem
                ? `This will permanently delete ${pendingDeleteItem.pilgrim.full_name}'s account.`
                : 'This will permanently delete this pilgrim account.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingDeleteItem(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => pendingDeleteItem && void deletePilgrimAccount(pendingDeleteItem)}
              disabled={!pendingDeleteItem || deletingPilgrimId === pendingDeleteItem.pilgrim._id}
            >
              {pendingDeleteItem && deletingPilgrimId === pendingDeleteItem.pilgrim._id ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Provision Pilgrim Accounts</CardTitle>
            <CardDescription>Pick a group, then create single or bulk pilgrim profiles.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Target group</Label>
                <Select value={selectedGroupId || 'none'} onValueChange={(value) => setSelectedGroupId(value === 'none' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select group</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>{group.group_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const errors = validateForm(form)
                setFormErrors(errors)
                if (Object.keys(errors).length === 0) {
                  onProvisionOne(e)
                }
              }}
              className="space-y-4"
            >
              {/* Basic Information Section */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <h4 className="mb-3 text-sm font-semibold text-foreground">Basic Information</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Full name <span className="text-xs text-muted-foreground">(3-100 chars)</span></Label>
                    <Input required value={form.full_name || ''} onChange={e => setForm((p) => ({ ...p, full_name: e.target.value }))} maxLength={100} minLength={3} />
                    {formErrors.full_name && <div className="text-xs text-red-600">{formErrors.full_name}</div>}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Phone number <span className="text-xs text-muted-foreground">(without country code)</span></Label>
                    <div className="flex gap-2">
                      <div className="sticky top-2 z-10">
                        <Select value={countryCode} onValueChange={(value) => setCountryCode(value)}>
                          <SelectTrigger className="w-[140px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+966">🇸🇦 +966 (SA)</SelectItem>
                          <SelectItem value="+20">🇪🇬 +20 (EG)</SelectItem>
                          <SelectItem value="+971">🇦🇪 +971 (AE)</SelectItem>
                          <SelectItem value="+974">🇶🇦 +974 (QA)</SelectItem>
                          <SelectItem value="+965">🇰🇼 +965 (KW)</SelectItem>
                          <SelectItem value="+973">🇧🇭 +973 (BH)</SelectItem>
                          <SelectItem value="+968">🇴🇲 +968 (OM)</SelectItem>
                          <SelectItem value="+962">🇯🇴 +962 (JO)</SelectItem>
                          <SelectItem value="+964">🇮🇶 +964 (IQ)</SelectItem>
                          <SelectItem value="+961">🇱🇧 +961 (LB)</SelectItem>
                          <SelectItem value="+963">🇸🇾 +963 (SY)</SelectItem>
                          <SelectItem value="+970">🇵🇸 +970 (PS)</SelectItem>
                          <SelectItem value="+216">🇹🇳 +216 (TN)</SelectItem>
                          <SelectItem value="+213">🇩🇿 +213 (DZ)</SelectItem>
                          <SelectItem value="+218">🇱🇾 +218 (LY)</SelectItem>
                          <SelectItem value="+249">🇸🇩 +249 (SD)</SelectItem>
                          <SelectItem value="+252">🇸🇴 +252 (SO)</SelectItem>
                          <SelectItem value="+967">🇾🇪 +967 (YE)</SelectItem>
                          <SelectItem value="+212">🇲🇦 +212 (MA)</SelectItem>
                          <SelectItem value="+222">🇲🇷 +222 (MR)</SelectItem>
                          <SelectItem value="+1">🇺🇸 +1 (US)</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44 (UK)</SelectItem>
                          <SelectItem value="+92">🇵🇰 +92 (PK)</SelectItem>
                          <SelectItem value="+91">🇮🇳 +91 (IN)</SelectItem>
                          <SelectItem value="+880">🇧🇩 +880 (BD)</SelectItem>
                          <SelectItem value="+62">🇮🇩 +62 (ID)</SelectItem>
                          <SelectItem value="+60">🇲🇾 +60 (MY)</SelectItem>
                          <SelectItem value="+90">🇹🇷 +90 (TR)</SelectItem>
                          <SelectItem value="+98">🇮🇷 +98 (IR)</SelectItem>
                          <SelectItem value="+93">🇦🇫 +93 (AF)</SelectItem>
                          <SelectItem value="+33">🇫🇷 +33 (FR)</SelectItem>
                          <SelectItem value="+49">🇩🇪 +49 (DE)</SelectItem>
                          <SelectItem value="+39">🇮🇹 +39 (IT)</SelectItem>
                          <SelectItem value="+34">🇪🇸 +34 (ES)</SelectItem>
                          <SelectItem value="+31">🇳🇱 +31 (NL)</SelectItem>
                        </SelectContent>
                        </Select>
                      </div>
                      <Input
                        required
                        type="tel"
                        placeholder="5xxxxxxxx"
                        value={form.phone_number || ''}
                        onChange={e => setForm((p) => ({ ...p, phone_number: e.target.value.replace(/[^0-9]/g, '') }))}
                        maxLength={15}
                        minLength={3}
                        className="flex-1"
                      />
                    </div>
                    {formErrors.phone_number && <div className="text-xs text-red-600">{formErrors.phone_number}</div>}
                    <p className="text-xs text-muted-foreground">Full number will be: {countryCode}{form.phone_number || '...'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Age <span className="text-xs text-muted-foreground">(0-120)</span></Label>
                    <Input type="number" value={form.age ?? ''} min={0} max={120} onChange={e => setForm((p) => ({ ...p, age: e.target.value ? Number(e.target.value) : undefined }))} />
                    {formErrors.age && <div className="text-xs text-red-600">{formErrors.age}</div>}
                  </div>
                  <div className="space-y-1">
                    <Label>Language <span className="text-xs text-muted-foreground">(required)</span></Label>
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
                    <Label>Ethnicity <span className="text-xs text-muted-foreground">(required)</span></Label>
                    <Select value={form.ethnicity || 'Other'} onValueChange={(value) => setForm((p) => ({ ...p, ethnicity: value as ProvisionPilgrimInput['ethnicity'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ETHNICITIES.map((item) => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Visa status <span className="text-xs text-muted-foreground">(required)</span></Label>
                    <Select value={form.visa?.status || 'unknown'} onValueChange={(value) => setForm((p) => ({ ...p, visa: { ...(p.visa || {}), status: value as NonNullable<NonNullable<ProvisionPilgrimInput['visa']>['status']> } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VISA_STATUSES.map((item) => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Extra Details Section */}
              <div className="rounded-lg border border-border/60 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setIsExtraDetailsOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <h4 className="text-sm font-semibold text-foreground">Extra Details (Optional)</h4>
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isExtraDetailsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isExtraDetailsOpen && (
                  <div className="border-t border-border/40 p-3 pt-2">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Hotel</Label>
                    <Select
                      value={form.hotel_id || 'none'}
                      onValueChange={(value) => {
                        const nextHotelId = value === 'none' ? undefined : value
                        const hotel = resourceHotels.find((item) => item._id === nextHotelId)
                        setForm((p) => ({
                          ...p,
                          hotel_id: nextHotelId,
                          hotel_name: hotel?.name,
                          room_id: undefined,
                          room_number: undefined,
                        }))
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No hotel</SelectItem>
                        {resourceHotels.map((hotel) => (
                          <SelectItem key={hotel._id} value={hotel._id}>{hotel.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Room</Label>
                    <Select
                      value={form.room_id || 'none'}
                      disabled={!selectedHotel}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setForm((p) => ({ ...p, room_id: undefined, room_number: undefined }))
                          return
                        }
                        const room = (selectedHotel?.rooms || []).find((item) => item._id === value)
                        setForm((p) => ({ ...p, room_id: value, room_number: room?.room_number }))
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No room</SelectItem>
                        {(selectedHotel?.rooms || [])
                          .filter((room) => room.active !== false)
                          .map((room) => (
                            <SelectItem key={room._id} value={room._id}>
                              {room.room_number}{room.floor ? ` - floor ${room.floor}` : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Bus</Label>
                    <Select
                      value={form.bus_id || 'none'}
                      onValueChange={(value) => {
                        if (value === 'none') {
                          setForm((p) => ({ ...p, bus_id: undefined, bus_info: undefined }))
                          return
                        }
                        const bus = resourceBuses.find((item) => item._id === value)
                        setForm((p) => ({
                          ...p,
                          bus_id: value,
                          bus_info: bus ? `${bus.bus_number} - ${bus.destination}` : undefined,
                        }))
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No bus</SelectItem>
                        {resourceBuses.map((bus) => (
                          <SelectItem key={bus._id} value={bus._id}>
                            {bus.bus_number} - {bus.destination}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>National ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input value={form.national_id ?? ''} onChange={e => setForm((p) => ({ ...p, national_id: e.target.value || undefined }))} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Medical history <span className="text-xs text-muted-foreground">(max 500 chars)</span></Label>
                    <Input value={form.medical_history ?? ''} maxLength={500} onChange={e => setForm((p) => ({ ...p, medical_history: e.target.value }))} />
                    {formErrors.medical_history && <div className="text-xs text-red-600">{formErrors.medical_history}</div>}
                  </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button type="submit" disabled={isProvisioningOne || !selectedGroupId}><Plus className="mr-2 size-4" />{isProvisioningOne ? 'Creating...' : 'Create pilgrim'}</Button>
                <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Upload className="size-4" />
                  {isProvisioningBulk ? 'Uploading...' : 'Upload Excel (.xlsx)'}
                  <input className="hidden" type="file" accept=".xlsx,.xls" onChange={(e) => void onBulkFileChange(e.target.files?.[0])} disabled={isProvisioningBulk || !selectedGroupId} />
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
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Provisioning Activity</CardTitle>
              <CardDescription>Track, manage, and view all provisioned pilgrims.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search pilgrims..."
                  className="h-9 w-[200px] pl-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="h-9 w-[130px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="activated">Activated</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {searchQuery.trim() || statusFilter !== 'all'
                ? 'No matching records found.'
                : 'No provisioning records yet for this group.'}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-2 py-2 font-medium">Pilgrim</th>
                    <th className="px-2 py-2 font-medium">Phone</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Issued</th>
                    <th className="px-2 py-2 font-medium">Activated</th>
                    <th className="px-2 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.pilgrim._id}
                      className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => setSelectedProvisioningItem(item)}
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium">{item.pilgrim.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.one_time_login.token ? '✓ code ready' : '⚠ needs reissue'}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{item.pilgrim.phone_number}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${getStatusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{formatDate(item.one_time_login.issued_at)}</td>
                      <td className="px-2 py-2 text-muted-foreground">{formatDate(item.one_time_login.used_at)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {item.status !== 'activated' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7"
                              onClick={(event) => {
                                event.stopPropagation()
                                void reissueCode(item.pilgrim._id)
                              }}
                              disabled={reissuingPilgrimId === item.pilgrim._id}
                              title="Refresh code"
                            >
                              <RefreshCw className={`size-4 ${reissuingPilgrimId === item.pilgrim._id ? 'animate-spin' : ''}`} />
                              <span className="sr-only">Refresh code</span>
                            </Button>
                          ) : (
                            <span className="h-7 w-7" />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={(event) => {
                              event.stopPropagation()
                              setPendingDeleteItem(item)
                            }}
                            disabled={deletingPilgrimId === item.pilgrim._id}
                            title="Delete account"
                          >
                            <Trash2 className={`size-4 ${deletingPilgrimId === item.pilgrim._id ? 'animate-pulse' : ''}`} />
                            <span className="sr-only">Delete account</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
