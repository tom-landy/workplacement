"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/placements", label: "Placements" },
  { href: "/careers/activities", label: "Careers Activities" },
  { href: "/careers/reporting", label: "Careers Reporting" },
  { href: "/employers", label: "Employers" },
  { href: "/opportunities/board", label: "Opportunities" },
  { href: "/staff/prospects", label: "Prospects" },
  { href: "/exports", label: "Exports" },
  { href: "/passport", label: "My Passport" },
  { href: "/student/prospects", label: "My Prospects" },
  { href: "/student/unit2", label: "Unit 2 – SMART Objectives" },
  { href: "/careers/unit2", label: "Unit 2 – Staff Review" },
  { href: "/employer", label: "Employer Portal" }
];

export function HeaderMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded border border-white/50 px-3 py-1 text-sm font-medium hover:bg-white/10"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Toggle site menu"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-64 rounded border border-slate-200 bg-white text-slate-900 shadow-lg z-50">
          <nav className="max-h-[70vh] overflow-auto py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-sm hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
