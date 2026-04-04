import {
  Bell,
  Check,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Trash2,
  Users,
  UserCircle2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import logo from '@/assets/logo.jpeg'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/features/auth/auth-context'
import { useI18n } from '@/i18n/use-i18n'
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from '@/services/api/notifications-api'
import { getGroupsDashboard } from '@/services/api/groups-api'
import { bindCommonRefreshEvents } from '@/services/realtime/common-events'
import { getRealtimeSocket } from '@/services/realtime/socket'
import { storage } from '@/services/storage'
import type { NotificationItem } from '@/types/notifications'

interface InAppBanner {
  id: string
  title: string
  message: string
}

function NavItem({
  to,
  label,
  icon: Icon,
  count,
  collapsed,
  onNavigate,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      <span className={`flex min-w-0 items-center ${collapsed ? '' : 'gap-3'}`}>
        <Icon className="size-4" />
        {collapsed ? null : <span className="truncate">{label}</span>}
      </span>
      {count && count > 0 ? (
        <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white ${collapsed ? 'absolute mt-[-18px] ml-[18px]' : ''}`}>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </NavLink>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [banner, setBanner] = useState<InAppBanner | null>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('mc_mod_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })
  const notificationPanelRef = useRef<HTMLDivElement | null>(null)
  const knownNotificationIdsRef = useRef<Set<string>>(new Set())
  const isFirstSyncRef = useRef(true)
  const isSyncingRef = useRef(false)
  const hasQueuedSyncRef = useRef(false)

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return

      const ctx = new AudioContextCtor()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(940, ctx.currentTime)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)

      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.24)
      oscillator.onended = () => {
        void ctx.close()
      }
    } catch {
      // Ignore audio playback issues silently.
    }
  }, [])

  const showBanner = useCallback(
    (title: string, message: string) => {
      setBanner({
        id: `${Date.now()}`,
        title,
        message,
      })
      playNotificationSound()
    },
    [playNotificationSound],
  )

  const getEntityId = (value: unknown): string | null => {
    if (!value) return null
    if (typeof value === 'string') return value
    if (typeof value === 'object' && '_id' in value) {
      const nestedId = (value as { _id?: unknown })._id
      return typeof nestedId === 'string' ? nestedId : null
    }
    return null
  }

  const performSyncNotifications = useCallback(async () => {
    if (!user) return
    if (!storage.getToken()) return

    const [notifications, unread] = await Promise.all([
      getNotifications(),
      getUnreadCount(),
    ])

    setNotifications(notifications)
    setUnreadCount(unread)

    if (isFirstSyncRef.current) {
      knownNotificationIdsRef.current = new Set(notifications.map((item) => item._id))
      isFirstSyncRef.current = false
      return
    }

    const latestNewUnread = notifications.find(
      (item) => !item.read && !knownNotificationIdsRef.current.has(item._id),
    )

    if (latestNewUnread) {
      showBanner(latestNewUnread.title, latestNewUnread.message)
    }

    notifications.forEach((item) => knownNotificationIdsRef.current.add(item._id))
  }, [showBanner, user])

  const syncNotifications = useCallback(async () => {
    if (isSyncingRef.current) {
      hasQueuedSyncRef.current = true
      return
    }

    isSyncingRef.current = true
    try {
      do {
        hasQueuedSyncRef.current = false
        await performSyncNotifications()
      } while (hasQueuedSyncRef.current)
    } finally {
      isSyncingRef.current = false
    }
  }, [performSyncNotifications])

  const handleOpenNotification = useCallback(
    async (item: NotificationItem) => {
      const groupId = getEntityId(item.data?.group_id)
      const pilgrimId = getEntityId(item.data?.pilgrim_id)

      if (!item.read) {
        await markNotificationRead(item._id)
      }

      if (groupId && pilgrimId) {
        navigate(`/app/groups/${groupId}/pilgrims?openPilgrim=${pilgrimId}`)
      } else if (groupId) {
        navigate(`/app/groups/${groupId}`)
      } else {
        navigate('/app/dashboard')
      }

      setIsNotificationsOpen(false)
      await syncNotifications()
    },
    [navigate, syncNotifications],
  )

  useEffect(() => {
    if (!user) return

    // Defer initial sync to avoid synchronous setState calls in effect body.
    const timer = window.setTimeout(() => {
      void syncNotifications()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [syncNotifications, user])

  useEffect(() => {
    if (!user) return

    const socket = getRealtimeSocket(user)

    const joinAllGroups = async () => {
      if (!storage.getToken()) return

      try {
        const groups = await getGroupsDashboard()
        groups.forEach((group) => {
          socket.emit('join_group', group._id)
        })
      } catch {
        // Ignore transient join sync errors; reconnect/events will retry.
      }
    }

    const handleRefresh = () => {
      void syncNotifications()
    }

    const handleSosAlert = (payload?: { pilgrimName?: string; message?: string }) => {
      showBanner('SOS Alert', payload?.message || `${payload?.pilgrimName || 'Pilgrim'} triggered SOS.`)
      void syncNotifications()
    }

    const handleConnect = () => {
      void joinAllGroups()
    }

    const unbindCommonRefresh = bindCommonRefreshEvents(socket, handleRefresh)
    socket.on('sos-alert-received', handleSosAlert)
    socket.on('connect', handleConnect)

    void joinAllGroups()

    return () => {
      unbindCommonRefresh()
      socket.off('sos-alert-received', handleSosAlert)
      socket.off('connect', handleConnect)
    }
  }, [showBanner, syncNotifications, user])

  useEffect(() => {
    if (!banner) return
    const timer = window.setTimeout(() => {
      setBanner(null)
    }, 4500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [banner])

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!notificationPanelRef.current) return
      if (!notificationPanelRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickAway)
    return () => {
      document.removeEventListener('mousedown', handleClickAway)
    }
  }, [])

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    try {
      window.localStorage.setItem('mc_mod_sidebar_collapsed', isDesktopSidebarCollapsed ? '1' : '0')
    } catch {
      // Ignore localStorage failures.
    }
  }, [isDesktopSidebarCollapsed])

  const navItems = [
    { to: '/app/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    {
      to: '/app/groups',
      label: t('nav.groups'),
      icon: Users,
      count: notifications.reduce((acc, item) => {
        const hasGroup = Boolean(getEntityId(item.data?.group_id))
        return !item.read && hasGroup ? acc + 1 : acc
      }, 0),
    },
    {
      to: '/app/pilgrims/provision',
      label: 'Pilgrim Provisioning',
      icon: UserPlus,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className={`grid min-h-screen grid-cols-1 ${isDesktopSidebarCollapsed ? 'lg:grid-cols-[86px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        {isMobileNavOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] transform flex-col border-r border-sidebar-border bg-sidebar p-5 transition-transform duration-200 lg:static lg:h-full lg:min-h-screen lg:translate-x-0 ${isDesktopSidebarCollapsed ? 'lg:w-[86px] lg:px-3' : 'lg:w-[280px]'} ${
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className={`mb-4 flex items-center ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
            <img src={logo} alt="Munawwara Care" className="size-10 rounded-lg object-cover" />
            {isDesktopSidebarCollapsed ? null : (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-sidebar-foreground">{t('app.name')}</p>
                  <p className="text-xs text-muted-foreground">{t('app.subtitle')}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hidden shrink-0 lg:inline-flex"
                  onClick={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
                  title={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isDesktopSidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                  <span className="sr-only">Toggle sidebar</span>
                </Button>
              </div>
            )}
          </div>

          <div className={`mb-1 flex ${isDesktopSidebarCollapsed ? 'justify-center' : 'hidden'}`}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden lg:inline-flex"
              onClick={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
              title={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isDesktopSidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>

          <Separator className="my-4" />

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} count={item.count} collapsed={isDesktopSidebarCollapsed} onNavigate={() => setIsMobileNavOpen(false)} />
            ))}
            <NavItem to="/app/profile" label={t('nav.profile')} icon={UserCircle2} collapsed={isDesktopSidebarCollapsed} onNavigate={() => setIsMobileNavOpen(false)} />
          </nav>

          {isDesktopSidebarCollapsed ? (
            <div className="mt-auto flex justify-center">
              <Button size="icon-sm" variant="ghost" onClick={() => void signOut()} title={t('shell.logout')}>
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-auto rounded-xl border border-border bg-card p-3">
              <p className="truncate text-sm text-muted-foreground">
                {t('shell.signed_in_as')}: <span className="font-semibold text-card-foreground">{user?.fullName}</span>
              </p>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="secondary">{user?.role}</Badge>
                <Button size="sm" variant="ghost" onClick={() => void signOut()}>
                  <LogOut className="mr-1 size-4" />
                  {t('shell.logout')}
                </Button>
              </div>
            </div>
          )}
        </aside>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.15),transparent_45%)]" />
          <div className="sticky top-0 z-20 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:hidden">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                aria-label="Open sidebar"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
            </div>
          </div>

          <div className="fixed right-2 top-2 z-20 sm:right-3 sm:top-3 lg:right-3 lg:top-3">
            <div className="relative" ref={notificationPanelRef}>
              <Button
                size="icon"
                variant="outline"
                aria-label="Open notifications"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="relative"
              >
                <Bell className="size-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </Button>

              {isNotificationsOpen ? (
                <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] rounded-xl border border-border bg-card p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    <Badge variant="secondary">{unreadCount} unread</Badge>
                  </div>

                  <div className="max-h-[360px] space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No notifications yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => void handleOpenNotification(item)}
                          className="w-full rounded-lg border border-border p-2.5 text-left transition hover:bg-muted"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground/80">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {!item.read ? (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  aria-label="Mark as read"
                                  title="Mark as read"
                                  onClick={async (event) => {
                                    event.stopPropagation()
                                    await markNotificationRead(item._id)
                                    await syncNotifications()
                                  }}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                              ) : null}
                              <Button
                                size="icon"
                                variant="outline"
                                aria-label="Delete notification"
                                title="Delete notification"
                                onClick={async (event) => {
                                  event.stopPropagation()
                                  await deleteNotification(item._id)
                                  await syncNotifications()
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <main className="relative p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

          {banner ? (
            <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] animate-in slide-in-from-bottom-3 fade-in-0 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 p-4 shadow-xl dark:border-orange-900/40 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-rose-950/20">
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">{banner.title}</p>
              <p className="mt-1 text-sm text-orange-800/90 dark:text-orange-200/90">{banner.message}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
