import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { Logo } from "../components/ui/Logo";
import { Lock, User } from "lucide-react";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const success = await login(username, password);
    if (success) {
      navigate("/");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-parchment)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--color-paper)] border border-[var(--color-ash)] p-8 sm:p-10 relative">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="mb-6">
            <Logo collapsed={false} />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)]/70 mb-1">
            PORTAL ACCESS & CREDENTIAL VERIFICATION
          </span>
          <h1 className="text-3xl font-normal uppercase leading-[0.85] tracking-tight text-[var(--color-ink)]">
            SIGN IN
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-[var(--color-stone)] border border-[var(--color-ash)] text-[var(--color-ink)] text-xs p-3 rounded-[10px] text-center font-mono">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)]/70 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User size={15} className="text-[var(--color-ink)]/50" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[var(--color-paper)] border border-[var(--color-ash)] rounded-[10px] py-2.5 pl-10 pr-4 text-sm text-[var(--color-ink)] font-mono focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-[0.05em] text-[var(--color-ink)]/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={15} className="text-[var(--color-ink)]/50" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--color-paper)] border border-[var(--color-ash)] rounded-[10px] py-2.5 pl-10 pr-4 text-sm text-[var(--color-ink)] font-mono focus:outline-none focus:border-[var(--color-ink)] transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full off-button-primary justify-center py-2.5 text-xs font-mono"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
