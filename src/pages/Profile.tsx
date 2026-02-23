import React, { useState, useEffect } from "react";
import { User, Mail, Shield, Key, Save, X } from "lucide-react";
import { useUser } from "../context/UserContext";

export function Profile() {
  const { profile, updateProfile } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">MY PROFILE</h1>
        <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">User Information & Roles</p>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] p-8 flex items-start gap-8">
        <div className="w-24 h-24 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
          <User size={48} />
        </div>
        <div className="space-y-4 flex-1">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Role</label>
                <input 
                  type="text" 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-medium text-[var(--text-primary)]">{profile.name}</h2>
              <p className="text-[var(--text-secondary)]">{profile.role}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-4 pt-4 border-t border-[var(--border)]">
            {!isEditing && (
              <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
                <Mail size={16} />
                <span>{profile.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
              <Shield size={16} />
              <span>Administrator Access</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
              <Key size={16} />
              <span>Last login: Today, 09:41 AM</span>
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 text-xs font-mono uppercase bg-[var(--text-primary)] text-[var(--bg-primary)] border border-[var(--border)] px-4 py-2 hover:bg-[var(--text-secondary)] transition-colors"
                >
                  <Save size={14} />
                  Save Changes
                </button>
                <button 
                  onClick={() => {
                    setFormData(profile);
                    setIsEditing(false);
                  }}
                  className="flex items-center gap-2 text-xs font-mono uppercase border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <X size={14} />
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-xs font-mono uppercase border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
