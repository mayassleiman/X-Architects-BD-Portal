import React from "react";
import { Database } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">SETTINGS</h1>
        <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">System Configuration</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">General Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Dark Mode</span>
              <div 
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-neutral-300'}`}
                onClick={toggleTheme}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all ${theme === 'dark' ? 'right-0.5 bg-emerald-400' : 'left-0.5 bg-white'}`}></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Email Notifications</span>
              <div className="w-10 h-5 bg-neutral-700 rounded-full relative cursor-pointer">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-neutral-400 rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Data Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-[var(--border)] bg-[var(--card-bg-inner)]">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-[var(--text-secondary)]" />
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Backup Database</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Download a copy of your local SQLite database.</p>
                </div>
              </div>
              <a 
                href="/api/download-db" 
                download="bd-portal.db"
                className="text-xs font-mono uppercase border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
              >
                Download
              </a>
            </div>

            <div className="flex items-center justify-between p-4 border border-[var(--border)] bg-[var(--card-bg-inner)]">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-[var(--text-secondary)]" />
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Restore Database</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Upload a database file to restore data. This will overwrite current data.</p>
                </div>
              </div>
              <label className="cursor-pointer text-xs font-mono uppercase border border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors">
                Upload
                <input 
                  type="file" 
                  accept=".db,.sqlite,.sqlite3"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    if (!confirm("This will overwrite your current database. Are you sure?")) return;

                    const formData = new FormData();
                    formData.append('database', file);

                    try {
                      const res = await fetch('/api/upload-db', {
                        method: 'POST',
                        body: formData
                      });
                      
                      if (res.ok) {
                        alert("Database uploaded successfully. The application will reload.");
                        window.location.reload();
                      } else {
                        alert("Failed to upload database.");
                      }
                    } catch (error) {
                      console.error("Error uploading database", error);
                      alert("Error uploading database.");
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">API Access</h3>
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-secondary)] mb-2">Use these endpoints to interact with the backend programmatically.</p>
            <div className="bg-black p-3 font-mono text-xs text-emerald-400 border border-white/10 rounded">
              GET /api/actions
            </div>
            <div className="bg-black p-3 font-mono text-xs text-emerald-400 border border-white/10 rounded">
              POST /api/actions
            </div>
            <div className="bg-black p-3 font-mono text-xs text-emerald-400 border border-white/10 rounded">
              GET /api/registrations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
