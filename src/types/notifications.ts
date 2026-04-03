export interface NotificationItem {
  _id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  data?: {
    group_id?: string | { _id?: string }
    pilgrim_id?: string | { _id?: string }
    group_name?: string
    pilgrim_name?: string
    [key: string]: unknown
  }
}

export interface ReminderItem {
  _id: string
  text: string
  target_type: 'group' | 'pilgrim'
  scheduled_at: string
  repeat_count: number
  repeat_interval_min: number
  status: string
}

export interface InvitationItem {
  _id: string
  invitee_email: string
  status: string
  created_at: string
  group_id?: string | {
    _id: string
    group_name: string
  }
}
