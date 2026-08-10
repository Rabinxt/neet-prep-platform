import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>;
}

