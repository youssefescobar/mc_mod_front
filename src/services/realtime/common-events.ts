import type { Socket } from 'socket.io-client'

export const COMMON_REFRESH_EVENTS = [
  'connect',
  'notification_refresh',
  'missed-call-received',
  'sos-alert-cancelled',
  'new_message',
  'message_deleted',
] as const

export function bindCommonRefreshEvents(socket: Socket, onRefresh: () => void): () => void {
  COMMON_REFRESH_EVENTS.forEach((eventName) => {
    socket.on(eventName, onRefresh)
  })

  return () => {
    COMMON_REFRESH_EVENTS.forEach((eventName) => {
      socket.off(eventName, onRefresh)
    })
  }
}
