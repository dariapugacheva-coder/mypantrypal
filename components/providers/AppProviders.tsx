"use client";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { DataProvider } from "@/lib/data/DataProvider";
import { ToastProvider, useToast } from "@/components/ui/toast";

function DataWithToasts({ children }: { children: ReactNode }) {
  const toast = useToast();
  return <DataProvider onError={toast.error} onSaved={toast.success}>{children}</DataProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <DataWithToasts>{children}</DataWithToasts>
      </AuthProvider>
    </ToastProvider>
  );
}
