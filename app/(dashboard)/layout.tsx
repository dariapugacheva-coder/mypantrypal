"use client";
import type { ReactNode } from "react";
import { ProtectedApp } from "@/components/layout/Guards";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ProtectedApp>{children}</ProtectedApp>;
}
