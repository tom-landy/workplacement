import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "College Placement and Careers Trial",
  description: "Internal careers and placement trial platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="bg-primary text-white p-4">
          <div className="max-w-6xl mx-auto flex gap-4 items-center">
            <h1 className="font-semibold">College Trial Platform</h1>
            <nav className="flex gap-3 text-sm">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/placements">Placements</Link>
              <Link href="/careers/activities">Careers</Link>
              <Link href="/exports">Exports</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
