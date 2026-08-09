import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { getDashboardAnalyticsForUser } from "@/server/analytics/dashboard";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Student Dashboard",
  description: "Your real NEET Practice and Mock Test performance.",
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const analytics = await getDashboardAnalyticsForUser(user.id);
  const firstName = user.name.trim().split(/\s+/)[0] || "there";

  return (
    <Container className="py-6 sm:py-10">
      <StudentDashboard firstName={firstName} email={user.email} analytics={analytics} />
    </Container>
  );
}
