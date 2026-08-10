import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "NEET Prep — Learn, Practise, Improve",
    template: "%s | NEET Prep",
  },
  description:
    "A focused NEET preparation platform for Physics, Chemistry, and Biology practice.",
  applicationName: "NEET Prep",
  keywords: [
    "NEET preparation",
    "NEET practice",
    "NEET mock tests",
    "NEET previous year questions",
  ],
  openGraph: {
    type: "website",
    siteName: "NEET Prep",
    title: "NEET Prep — Learn, Practise, Improve",
    description: "Focused Physics, Chemistry, and Biology practice for NEET preparation.",
    url: "/",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
