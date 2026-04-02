import {
  Bell,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquare,
  ShieldCheck,
  Users,
  UserCircle2,
  AlarmClock,
  Ticket,
  TriangleAlert,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/features/auth/auth-context'
import { useI18n } from '@/i18n/i18n-context'

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </NavLink>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const { t } = useI18n()

  const navItems = [
    { to: '/app/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/app/groups', label: t('nav.groups'), icon: Users },
    { to: '/app/map', label: t('nav.map'), icon: MapPinned },
    { to: '/app/alerts', label: t('nav.alerts'), icon: TriangleAlert },
    { to: '/app/notifications', label: t('nav.notifications'), icon: Bell },
    { to: '/app/reminders', label: t('nav.reminders'), icon: AlarmClock },
    { to: '/app/invitations', label: t('nav.invitations'), icon: Ticket },
    { to: '/app/profile', label: t('nav.profile'), icon: UserCircle2 },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-sidebar-border bg-sidebar p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground">{t('app.name')}</p>
              <p className="text-xs text-muted-foreground">{t('app.subtitle')}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
            ))}
            <NavItem to="/app/chats/group" label={t('nav.chat')} icon={MessageSquare} />
          </nav>

          <div className="mt-8 rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{t('shell.signed_in_as')}</p>
            <p className="truncate text-sm font-semibold text-card-foreground">{user?.fullName}</p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="secondary">{user?.role}</Badge>
              <Button size="sm" variant="ghost" onClick={() => void signOut()}>
                <LogOut className="mr-1 size-4" />
                {t('shell.logout')}
              </Button>
            </div>
          </div>
        </aside>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.15),transparent_45%)]" />
          <main className="relative p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
