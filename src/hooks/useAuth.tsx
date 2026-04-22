/**
 * SAR Auth Context — Email + OTP session management
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-based access:
 *   "host"        — full platform access
 *   "viewer"      — AI prediction, Danger Assessment, Weather, 500 km cap
 *   "free_viewer" — read-only map + weather, no AI, no live feed
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, createContext, useContext } from "react";

export type UserRole = "host" | "viewer" | "free_viewer";

export interface SARUser {
  email: string;
  role: UserRole;
  loginAt: number;
}

const SESSION_KEY    = "sar_auth_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ── Persist / load session ─────────────────────────────────────────────────

export function loadSession(): SARUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: SARUser = JSON.parse(raw);
    if (Date.now() - s.loginAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(user: SARUser): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {}
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

// ── Context ────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: SARUser | null;
  login: (user: SARUser) => void;
  logout: () => void;
  isHost: boolean;
  isViewer: boolean;
  isFreeViewer: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  isHost: false,
  isViewer: false,
  isFreeViewer: false,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SARUser | null>(() => loadSession());

  const login = useCallback((u: SARUser) => {
    saveSession(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        login,
        logout,
        isHost:        user?.role === "host",
        isViewer:      user?.role === "viewer",
        isFreeViewer:  user?.role === "free_viewer",
        isAuthenticated: !!user,
      },
    },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
