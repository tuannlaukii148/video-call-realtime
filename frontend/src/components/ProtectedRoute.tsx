import React from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Navigate } from "react-router";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}