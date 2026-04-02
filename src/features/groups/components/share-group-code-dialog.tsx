import { toPng } from 'html-to-image'
import { Copy, Download, QrCode, Share2, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useI18n } from '@/i18n/use-i18n'
import { getGroupQr } from '@/services/api/groups-api'

interface ShareGroupCodeDialogProps {
  groupId: string
  groupName: string
  groupCode: string
  moderatorName?: string
}

export function ShareGroupCodeDialog({
  groupId,
  groupName,
  groupCode,
  moderatorName,
}: ShareGroupCodeDialogProps) {
  const [open, setOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const posterRef = useRef<HTMLDivElement | null>(null)
  const { t } = useI18n()

  const displayModerator = useMemo(
    () => moderatorName || 'Moderator',
    [moderatorName],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const loadQr = async () => {
      setIsLoading(true)
      setStatus(null)
      try {
        const qr = await getGroupQr(groupId)
        setQrDataUrl(qr)
      } catch {
        setStatus('Failed to load QR code')
      } finally {
        setIsLoading(false)
      }
    }

    void loadQr()
  }, [groupId, open])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(groupCode)
      setStatus('Code copied')
    } catch {
      setStatus('Copy failed')
    }
  }

  const handleDownloadPoster = async () => {
    if (!posterRef.current) {
      return
    }

    setIsDownloading(true)
    setStatus(null)

    try {
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      })
      const link = document.createElement('a')
      link.download = `invite_${groupCode}.png`
      link.href = dataUrl
      link.click()
      setStatus('Image downloaded')
    } catch {
      setStatus('Download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="mr-2 size-4" />
          {t('share.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[420px] max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('share.title')}</DialogTitle>
          <DialogDescription>{t('share.description')}</DialogDescription>
        </DialogHeader>

        <div
          ref={posterRef}
          className="mx-auto w-full max-w-[340px] rounded-2xl bg-white px-4 py-5 text-center sm:max-w-[380px] sm:px-6 sm:py-6"
        >
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#F0F0F8] sm:size-16">
            <ShieldCheck className="size-7 text-[#F97316] sm:size-8" />
          </div>

          <h3 className="mt-4 text-xl font-bold text-[#1A1A4E] sm:text-2xl">{groupName}</h3>
          <p className="mt-1 text-sm text-[#64748B]">Moderated by {displayModerator}</p>

          <p className="mt-5 text-xs font-bold tracking-[0.2em] text-[#1A1A4E] sm:mt-6 sm:text-sm">SCAN TO JOIN</p>

          <div className="mx-auto mt-3 w-full max-w-[200px] rounded-2xl border-[3px] border-[#E8C97A] p-2.5 sm:max-w-[220px] sm:p-3">
            <div className="grid aspect-square w-full place-items-center rounded-lg bg-white">
              {isLoading ? (
                <p className="text-sm text-[#64748B]">Loading QR...</p>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="Group QR" className="h-full w-full object-contain" />
              ) : (
                <div className="text-[#64748B]">
                  <QrCode className="mx-auto size-8" />
                  <p className="mt-2 text-xs">QR unavailable</p>
                </div>
              )}
            </div>
          </div>

          <p className="mt-5 text-sm text-[#64748B]">Or join using code:</p>
          <div className="mx-auto mt-2 w-full max-w-[280px] rounded-xl border border-[#E8C97A80] bg-[#F0F0F8] px-4 py-3 sm:px-6">
            <p className="text-2xl font-bold tracking-[0.28em] text-[#B0924A] sm:text-3xl sm:tracking-[0.38em]">
              {groupCode}
            </p>
          </div>

          <p className="mt-5 text-xs font-semibold text-[#F97316] sm:mt-6">
            Download Munawwara Care to get started.
          </p>
        </div>

        <div className="mt-1 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={handleCopyCode}>
            <Copy className="mr-2 size-4" />
            {t('share.copy_code')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDownloadPoster()}
            disabled={isDownloading}
          >
            <Download className="mr-2 size-4" />
            {isDownloading ? 'Downloading...' : t('share.download_image')}
          </Button>
        </div>

        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
