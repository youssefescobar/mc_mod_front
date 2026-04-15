import { Bus, Calendar, Clock, FileText, Hotel, Mail, MapPin, Phone, UserCircle2, User2, Users } from 'lucide-react'

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="size-5" />
            {pilgrim.full_name}
          </DialogTitle>
          <DialogDescription>Complete pilgrim profile information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Status:</p>
            {pilgrim.is_online ? (
              <Badge>Online</Badge>
            ) : (
              <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-700">
                Offline
              </Badge>
            )}
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <User2 className="size-3" />
              Personal Information
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {pilgrim.age !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-medium">{pilgrim.age} years</p>
                </div>
              )}
              {pilgrim.gender && (
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{pilgrim.gender}</p>
                </div>
              )}
              {pilgrim.ethnicity && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Ethnicity</p>
                  <p className="font-medium">{pilgrim.ethnicity}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Phone className="size-3" />
              Contact
            </p>
            <div className="space-y-2 text-sm">
              {pilgrim.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <a href={`tel:${pilgrim.phone_number}`} className="text-blue-600 hover:underline">
                    {pilgrim.phone_number}
                  </a>
                </div>
              )}
              {pilgrim.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${pilgrim.email}`} className="text-blue-600 hover:underline">
                    {pilgrim.email}
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

          {/* Accommodation & Transport */}
          {(pilgrim.hotel_name || pilgrim.room_number || pilgrim.bus_info) && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Hotel className="size-3" />
                  Accommodation & Transport
                </p>
                <div className="space-y-2 text-sm">
                  {pilgrim.hotel_name && (
                    <div className="flex items-center gap-2">
                      <Hotel className="size-4 text-muted-foreground" />
                      <span>{pilgrim.hotel_name}</span>
                    </div>
                  )}
                  {pilgrim.room_number && (
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <span>Room {pilgrim.room_number}</span>
                    </div>
                  )}
                  {pilgrim.bus_info && (
                    <div className="flex items-center gap-2">
                      <Bus className="size-4 text-muted-foreground" />
                      <span>{pilgrim.bus_info}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Visa Information */}
          {pilgrim.visa && (pilgrim.visa.visa_number || pilgrim.visa.status) && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Calendar className="size-3" />
                  Visa Information
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {pilgrim.visa.visa_number && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Visa Number</p>
                      <p className="font-mono font-medium">{pilgrim.visa.visa_number}</p>
                    </div>
                  )}
                  {pilgrim.visa.status && (
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{pilgrim.visa.status}</p>
                    </div>
                  )}
                  {pilgrim.visa.issue_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Issue Date</p>
                      <p className="font-medium">{new Date(pilgrim.visa.issue_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {pilgrim.visa.expiry_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expiry Date</p>
                      <p className="font-medium">{new Date(pilgrim.visa.expiry_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Medical History */}
          {pilgrim.medical_history && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="size-3" />
                  Medical History
                </p>
                <p className="text-sm bg-muted/50 rounded-md p-2">{pilgrim.medical_history}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Location Information */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="size-3" />
              Location
            </p>
            <div className="space-y-2 text-sm">
              {pilgrim.location ? (
                <>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="font-mono">
                      {pilgrim.location.lat.toFixed(6)}, {pilgrim.location.lng.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Last Updated: {lastActiveDate}</span>
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
