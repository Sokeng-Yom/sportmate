"use client";

import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import { RouteGuard } from "../../lib/auth";
import { AdminToastProvider } from "./components/AdminToast";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard roles={["ADMIN"]}>
      <AdminToastProvider>
        <AdminShell>{children}</AdminShell>
      </AdminToastProvider>
    </RouteGuard>
  );
}
