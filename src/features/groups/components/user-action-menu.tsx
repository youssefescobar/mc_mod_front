import { MapPin, Trash2, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { UserMarker } from '@/types/map'

interface UserActionMenuProps {
  user: UserMarker
  onViewProfile: (userId: string) => void
  onNavigate?: (userId: string) => void
  onRemove?: (userId: string) => void
}

export function UserActionMenu({ user, onViewProfile, onNavigate, onRemove }: UserActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="text-lg">•••</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewProfile(user._id)} className="cursor-pointer">
          <User className="mr-2 size-4" />
          View Profile
        </DropdownMenuItem>
        {onNavigate && (
          <DropdownMenuItem onClick={() => onNavigate(user._id)} className="cursor-pointer">
            <MapPin className="mr-2 size-4" />
            Navigate
          </DropdownMenuItem>
        )}
        {onRemove && (
          <DropdownMenuItem
            onClick={() => onRemove(user._id)}
            className="cursor-pointer text-red-600"
          >
            <Trash2 className="mr-2 size-4" />
            Remove
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
