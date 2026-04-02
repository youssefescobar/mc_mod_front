import { MapPin, Phone, UserCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { UserMarker } from '@/types/map'

interface PilgrimProfileDialogProps {
  pilgrim: UserMarker | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PilgrimProfileDialog({
  pilgrim,
  open,
  onOpenChange,
}: PilgrimProfileDialogProps) {
  if (!pilgrim) return null

  const lastActiveDate = pilgrim.last_active_at
    ? new Date(pilgrim.last_active_at).toLocaleString()
    : 'Never'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="size-5" />
            {pilgrim.full_name}
          </DialogTitle>
          <DialogDescription>Pilgrim profile and location information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
            {pilgrim.is_online ? (
              <Badge>Online</Badge>
            ) : (
              <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-700">
                Offline
              </Badge>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Contact</p>
            <div className="space-y-2 text-sm">
              {pilgrim.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <a href={`tel:${pilgrim.phone_number}`} className="text-blue-600 hover:underline">
                    {pilgrim.phone_number}
                  </a>
                </div>
              )}
              {pilgrim.national_id && (
                <div>
                  <p className="text-xs text-muted-foreground">National ID</p>
                  <p className="font-mono text-sm font-semibold">{pilgrim.national_id}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location Information */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Location</p>
            <div className="space-y-2 text-sm">
              {pilgrim.location ? (
                <>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="font-mono">
                      {pilgrim.location.lat.toFixed(6)}, {pilgrim.location.lng.toFixed(6)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-xs">{lastActiveDate}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No location data available</p>
              )}
            </div>
          </div>

          {/* Battery Information */}
          {pilgrim.battery_percent !== undefined && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Device Battery</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        pilgrim.battery_percent > 50
                          ? 'bg-green-500'
                          : pilgrim.battery_percent > 20
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${pilgrim.battery_percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{pilgrim.battery_percent}%</span>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
