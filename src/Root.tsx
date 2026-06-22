import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import App from "./App.tsx";
import LoginPage from "./LoginPage.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import { getActiveSession } from "./auth.ts";
import type { UserProfile } from "./auth.ts";

function AuthGuard({ user, children }: { user: UserProfile | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function Root() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const s = getActiveSession();
    return s ? s.user : null;
  });

  return (
    <Routes>
      <Route path="/" element={<LandingPage user={user} />} />
      <Route path="/about" element={<AboutPage user={user} />} />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/chat" replace />
          ) : (
            <LoginPage onLogin={(u) => setUser(u)} defaultMode="login" />
          )
        }
      />
      <Route
        path="/signup"
        element={
          user ? (
            <Navigate to="/chat" replace />
          ) : (
            <LoginPage onLogin={(u) => setUser(u)} defaultMode="register" />
          )
        }
      />
      <Route
        path="/chat"
        element={
          <AuthGuard user={user}>
            <App user={user!} onLogout={() => setUser(null)} />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
