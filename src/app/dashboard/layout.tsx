import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <main>{children}</main>
    </div>
  );
}
