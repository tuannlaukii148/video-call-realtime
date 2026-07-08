import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { DashboardScreen } from "./screens/dashboard/DashboardScreen";
import { LobbyScreen } from "./screens/lobby/LobbyScreen";
import { MeetingScreen } from "./screens/meeting/MeetingScreen";
import { ScheduleScreen } from "./screens/schedule/ScheduleScreen";
import { AdminDashboardScreen } from "./screens/admin/AdminDashboardScreen";
import { RecordingScreen } from "./screens/RecordingScreen";
import { ArchivesScreen } from "./screens/archives/ArchivesScreen";
import { RecordingPlayerScreen } from "./screens/archives/RecordingPlayerScreen";
import { SignupScreen } from "./screens/auth/SignupScreen";
import { LoginScreen } from "./screens/auth/LoginScreen";
import { ProfileScreen } from "./screens/auth/ProfileScreen";
import { VerifyEmailScreen } from "./screens/auth/VerifyEmailScreen";
import { ForgotPasswordScreen } from "./screens/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "./screens/auth/ResetPasswordScreen";
import { MessagesScreen } from "./screens/messages/MessagesScreen";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Toaster } from "sonner";
import { useAuthStore } from "./stores/useAuthStore";
import React, { useEffect } from "react";
import useGlobalChatListener from "@/hooks/useGlobalChatListener";
// Removed duplicate import of useGlobalChatListener
import { connectSocket } from "@/socket/socket";
import { useMessageStore } from "@/stores/messageStore";
 // notifications removed - popup removed

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuthStore();
  if (accessToken) {
    // Admin gets redirected to /admin, regular users to /
    if (user?.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  useGlobalChatListener();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (accessToken) {
      try { connectSocket(); } catch (e) { console.warn('connectSocket failed', e); }
    }
    const ms = useMessageStore;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__incrementUnread = (convId: string) => {
      try {
        ms.getState().incrementUnread(convId);
      } catch (e) {
        console.warn('increment failed', e);
      }
    };
  }, [accessToken]);

  return (
    <>
      <Toaster richColors position="bottom-right" />
      <BrowserRouter>
        <Routes>
           <Route path="signup" element={<AuthRoute><SignupScreen /></AuthRoute>} />
          <Route path="signin" element={<AuthRoute><LoginScreen /></AuthRoute>} />
          <Route path="forgot-password" element={<AuthRoute><ForgotPasswordScreen /></AuthRoute>} />
          <Route path="auth/verify-email" element={<VerifyEmailScreen />} />
          <Route path="auth/reset-password" element={<ResetPasswordScreen />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/schedule" element={<ScheduleScreen />} />
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/meeting/:id" element={<MeetingScreen />} />
            <Route path="/recording" element={<RecordingScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/archives" element={<ArchivesScreen />} />
            <Route path="/archives/:id" element={<RecordingPlayerScreen />} />
            <Route path="/messages" element={<MessagesScreen />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<AdminDashboardScreen />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
