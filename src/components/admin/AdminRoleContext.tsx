"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AdminRole = "admin" | "editor";

interface AdminSession {
  role: AdminRole;
  userId: string;
}

const AdminRoleContext = createContext<AdminSession | null>(null);

export function AdminRoleProvider({
  role,
  userId,
  children,
}: {
  role: AdminRole;
  userId: string;
  children: ReactNode;
}) {
  return (
    <AdminRoleContext.Provider value={{ role, userId }}>
      {children}
    </AdminRoleContext.Provider>
  );
}

export function useAdminSession(): AdminSession {
  const ctx = useContext(AdminRoleContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within AdminRoleProvider");
  }
  return ctx;
}

export function useIsAdmin(): boolean {
  return useAdminSession().role === "admin";
}
