import { io, type Socket } from 'socket.io-client'

import type { AuthUser } from '@/types/auth'

let socketInstance: Socket | null = null

function getSocketServerUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.toString() || 'http://localhost:5000/api'

  try {
    const parsed = new URL(apiBase)
    if (import.meta.env.PROD && parsed.protocol !== 'https:') {
      throw new Error(`Insecure socket API base URL in production: ${apiBase}`)
    }
    return parsed.origin
  } catch {
    if (import.meta.env.PROD) {
      throw new Error(`Invalid or insecure socket URL in production: ${apiBase}`)
    }
    return 'http://localhost:5000'
  }
}

export function getRealtimeSocket(user: AuthUser): Socket {
  if (!socketInstance) {
    socketInstance = io(getSocketServerUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: false,
      autoConnect: true,
    })

    socketInstance.on('connect', () => {
      socketInstance?.emit('register-user', {
        userId: user.id,
        role: user.role,
      })
    })
  }

  if (socketInstance.connected) {
    socketInstance.emit('register-user', {
      userId: user.id,
      role: user.role,
    })
  }

  return socketInstance
}

export function teardownRealtimeSocket() {
  if (!socketInstance) return
  socketInstance.removeAllListeners()
  socketInstance.disconnect()
  socketInstance = null
}
