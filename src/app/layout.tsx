import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
