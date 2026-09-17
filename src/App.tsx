import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";

import { Actions } from "./pages/Actions";
import { Registrations } from "./pages/Registrations";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { FullReport } from "./pages/FullReport";

import { Meetings } from "./pages/Meetings";
import { AchievedTarget } from "./pages/AchievedTarget";
import { Pipeline } from "./pages/Pipeline";
import { Archived } from "./pages/Archived";
import { MasterDirectory } from "./pages/MasterDirectory";
import { EmailGun } from "./pages/EmailGun";
import { FollowUpReminder } from "./components/features/FollowUpReminder";
import { SearchProvider } from "./context/SearchContext";
import { UserProvider, useUser } from "./context/UserContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { Login } from "./pages/Login";
import { TopDownCalc } from "./pages/TopDownCalc";

// Placeholder components for other routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-[var(--color-ink)]/60 space-y-4">
    <div className="w-16 h-16 border border-dashed border-[var(--color-ash)] rounded-full flex items-center justify-center">
      <span className="text-xl font-mono text-[var(--color-ink)]/40">×</span>
    </div>
    <h2 className="text-xl font-normal tracking-[0.05em] uppercase text-[var(--color-ink)]">{title}</h2>
    <p className="text-xs font-mono uppercase tracking-[0.05em] text-[var(--color-ink)]/50">Module under construction</p>
  </div>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUser();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useUser();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <SearchProvider>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/achieved-target" element={<AchievedTarget />} />
                  <Route path="/actions" element={<Actions />} />
                  <Route path="/directory" element={<MasterDirectory />} />
                  <Route path="/email-gun" element={<EmailGun />} />
                  <Route path="/registrations" element={<Registrations />} />
                  <Route path="/meetings" element={<Meetings />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/archived" element={<Archived />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/report" element={<FullReport />} />
                  <Route path="/top-down-calc" element={<TopDownCalc />} />
                </Routes>
                <FollowUpReminder />
              </AppLayout>
            </SearchProvider>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  React.useEffect(() => {
    // Check if custom logo exists and update favicon
    fetch('/api/logo', { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = `/api/logo?t=${new Date().getTime()}`;
            link.type = 'image/png';
          } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = `/api/logo?t=${new Date().getTime()}`;
            newLink.type = 'image/png';
            document.head.appendChild(newLink);
          }
        }
      })
      .catch(() => {
        // Keep default favicon
      });
  }, []);

  return (
    <UserProvider>
      <CurrencyProvider>
        <AppRoutes />
      </CurrencyProvider>
    </UserProvider>
  );
}
