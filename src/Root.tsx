import { useState } from 'react'
import App from './App.tsx'
import LoginPage from './LoginPage.tsx'
import { getActiveSession } from './auth.ts'
import type { UserProfile } from './auth.ts'

export default function Root() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const s = getActiveSession();
    return s ? s.user : null;
  });

  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  return <App user={user} onLogout={() => setUser(null)} />;
}
