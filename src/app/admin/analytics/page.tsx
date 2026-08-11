import type { Metadata } from "next";
import { AdminAnalyticsView } from "@/components/admin/admin-analytics";
import { getAdminAnalytics } from "@/server/admin/analytics";

export const metadata: Metadata = { title: "Admin Analytics", description: "Platform-wide NEET Prep attempt and question analytics." };

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminAnalytics();
  return <AdminAnalyticsView analytics={analytics} />;
}
