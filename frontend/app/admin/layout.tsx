"use client";

import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import { RouteGuard } from "../../lib/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard roles={["ADMIN"]}>
      <AdminShell>{children}</AdminShell>
    </RouteGuard>
  );
}
