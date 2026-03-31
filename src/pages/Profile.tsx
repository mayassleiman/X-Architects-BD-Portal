import React, { useState, useEffect, useRef } from "react";
import { User, Mail, Shield, Key, Save, X, Camera, Plus, Trash2 } from "lucide-react";
import { useUser, UserProfile } from "../context/UserContext";

export function Profile() {
  const { profile, updateProfile, users, addUser, deleteUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New user form state
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "User",
    email: ""
  });

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  if (!profile || !formData) return null;

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, image: base64String });
        updateProfile({ ...profile, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.name) return;
    
    addUser({
      id: `user-${Date.now()}`,
      ...newUser
    });
    
    setNewUser({
      username: "",
      password: "",
      name: "",
      role: "User",
      email: ""
    });
    setShowNewUserForm(false);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] mb-2">MY PROFILE</h1>
        <p className="text-[var(--text-secondary)] font-mono text-sm uppercase tracking-wider">User Information & Roles</p>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] p-8 flex flex-col md:flex-row items-start gap-8">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] overflow-hidden">
            {profile.image ? (
              <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} />
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full shadow-lg hover:scale-110 transition-transform"
            title="Upload Image"
          >
            <Camera size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div className="space-y-4 flex-1 w-full">
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

      {/* User Management Section */}
      <div className="mt-12">
        <div className="flex justify-between items-end mb-6 border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)] mb-1">USER MANAGEMENT</h2>
            <p className="text-[var(--text-secondary)] font-mono text-xs uppercase tracking-wider">Manage portal access</p>
          </div>
          <button 
            onClick={() => setShowNewUserForm(!showNewUserForm)}
            className="flex items-center gap-2 text-xs font-mono uppercase bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2 hover:bg-[var(--text-secondary)] transition-colors"
          >
            {showNewUserForm ? <X size={14} /> : <Plus size={14} />}
            {showNewUserForm ? "Cancel" : "New User"}
          </button>
        </div>

        {showNewUserForm && (
          <form onSubmit={handleCreateUser} className="bg-[var(--card-bg)] border border-[var(--border)] p-6 mb-8 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Create New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Username *</label>
                <input 
                  type="text" 
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Password *</label>
                <input 
                  type="password" 
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Email</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Role</label>
                <input 
                  type="text" 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[var(--text-secondary)] transition-colors"
            >
              Create User
            </button>
          </form>
        )}

        <div className="bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                <th className="p-4 text-xs font-mono uppercase text-[var(--text-secondary)] font-normal">User</th>
                <th className="p-4 text-xs font-mono uppercase text-[var(--text-secondary)] font-normal">Role</th>
                <th className="p-4 text-xs font-mono uppercase text-[var(--text-secondary)] font-normal">Email</th>
                <th className="p-4 text-xs font-mono uppercase text-[var(--text-secondary)] font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center overflow-hidden shrink-0">
                        {u.image ? (
                          <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-[var(--text-secondary)]" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{u.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{u.role}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{u.email}</td>
                  <td className="p-4 text-right">
                    {u.id !== profile.id && (
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${u.name}?`)) {
                            deleteUser(u.id);
                          }
                        }}
                        className="text-[var(--text-secondary)] hover:text-red-400 p-2 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[var(--text-secondary)] text-sm">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
