"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppUser } from "@/types";

interface AuthContextValue {
  user: AppUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser?: AppUser | null;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user: initialUser ?? null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}