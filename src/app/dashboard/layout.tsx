import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { requireUser } from "@/server/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("/dashboard");
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={{ name: user.name, email: user.email }} />
      <main>{children}</main>
    </div>
  );
}
