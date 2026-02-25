import React from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";

import { Actions } from "./pages/Actions";
import { Registrations } from "./pages/Registrations";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { FullReport } from "./pages/FullReport";

import { Tasks } from "./pages/Tasks";

import { Meetings } from "./pages/Meetings";
import { Pipeline } from "./pages/Pipeline";
import { MasterDirectory } from "./pages/MasterDirectory";
import { FollowUpReminder } from "./components/features/FollowUpReminder";
import { SearchProvider } from "./context/SearchContext";
import { UserProvider } from "./context/UserContext";

// Placeholder components for other routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-neutral-500 space-y-4">
    <div className="w-16 h-16 border border-dashed border-neutral-700 rounded-full flex items-center justify-center">
      <span className="text-2xl font-mono text-neutral-700">X</span>
    </div>
    <h2 className="text-xl font-light tracking-widest uppercase">{title}</h2>
    <p className="text-sm font-mono text-neutral-600">Module under construction</p>
  </div>
);

export default function App() {
  // Simple client-side routing for demo purposes
  const [path, setPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Intercept link clicks for SPA navigation
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.getAttribute("href")?.startsWith("/")) {
        e.preventDefault();
        const href = target.getAttribute("href")!;
        window.history.pushState({}, "", href);
        setPath(href);
        // Dispatch event for Sidebar
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    };
    // We rely on Sidebar's click handler mostly, but this handles other links
  }, []);
  
  return (
    <UserProvider>
      <SearchProvider>
        <AppLayout>
          {path === "/" && <Dashboard />}
          {path === "/actions" && <Actions />}
          {path === "/directory" && <MasterDirectory />}
          {path === "/registrations" && <Registrations />}
          {path === "/meetings" && <Meetings />}
          {path === "/pipeline" && <Pipeline />}
          {path === "/tasks" && <Tasks />}
          {path === "/settings" && <Settings />}
          {path === "/profile" && <Profile />}
          {path === "/report" && <FullReport />}
          <FollowUpReminder />
        </AppLayout>
      </SearchProvider>
    </UserProvider>
  );
}
