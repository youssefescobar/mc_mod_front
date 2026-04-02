import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { AuthProvider } from '@/features/auth/auth-context'
import { LoginPage } from '@/features/auth/pages/login-page'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { AlertsPage } from '@/features/alerts/pages/alerts-page'
import { I18nProvider } from '@/i18n/i18n-context'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { GroupChatPage } from '@/features/chat/pages/group-chat-page'
import { IndividualChatPage } from '@/features/chat/pages/individual-chat-page'
import { GroupDetailsPage } from '@/features/groups/pages/group-details-page'
import { GroupsPage } from '@/features/groups/pages/groups-page'
import { InvitationsPage } from '@/features/invitations/pages/invitations-page'
import { MapPage } from '@/features/map/pages/map-page'
import { NotificationsPage } from '@/features/notifications/pages/notifications-page'
import { ProfilePage } from '@/features/profile/pages/profile-page'
import { RemindersPage } from '@/features/reminders/pages/reminders-page'

export function AppRouter() {
  return (
    <AuthProvider>
      <I18nProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="groups/:groupId" element={<GroupDetailsPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reminders" element={<RemindersPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="chats/group" element={<GroupChatPage />} />
              <Route path="chats/group/:groupId/:recipientId" element={<IndividualChatPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </I18nProvider>
    </AuthProvider>
  )
}
