import { io, type Socket } from 'socket.io-client'

import type { AuthUser } from '@/types/auth'

let socketInstance: Socket | null = null
let heartbeatTimer: number | null = null

const HEARTBEAT_INTERVAL_MS = 20000
const RECONNECTION_DELAY_MS = 1000
const RECONNECTION_DELAY_MAX_MS = 15000
const CONNECTION_TIMEOUT_MS = 12000

function clearHeartbeat() {
  if (heartbeatTimer === null) return
  window.clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

function startHeartbeat() {
  clearHeartbeat()

  heartbeatTimer = window.setInterval(() => {
    if (!socketInstance?.connected) return
    socketInstance.volatile.emit('client-heartbeat', { ts: Date.now() })
  }, HEARTBEAT_INTERVAL_MS)
}

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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: RECONNECTION_DELAY_MS,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
      randomizationFactor: 0.5,
      timeout: CONNECTION_TIMEOUT_MS,
    })

    socketInstance.on('connect', () => {
      socketInstance?.emit('register-user', {
        userId: user.id,
        role: user.role,
      })
      startHeartbeat()
    })

    socketInstance.on('disconnect', (reason) => {
      clearHeartbeat()

      // Server-forced disconnect requires manual reconnect.
      if (reason === 'io server disconnect') {
        socketInstance?.connect()
      }
    })

    socketInstance.on('connect_error', () => {
      // Ensure stale heartbeat doesn't keep running across transient failures.
      clearHeartbeat()
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
  clearHeartbeat()
  socketInstance.removeAllListeners()
  socketInstance.disconnect()
  socketInstance = null
}
