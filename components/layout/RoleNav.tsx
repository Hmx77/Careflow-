"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  HeartPulse,
  Home,
  MonitorUp,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  UsersRound
} from "lucide-react";

const roleLinks = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/reception", label: "Reception", icon: ClipboardList },
  { href: "/nurse", label: "Nurse Station", icon: UserRoundCheck },
  { href: "/display", label: "Display", icon: MonitorUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/check-in", label: "Check-in", icon: ShieldCheck }
];

export function RoleNav() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col rounded-2xl p-4 lg:flex">
      <Link href="/" prefetch={false} className="mb-7 flex items-center gap-3 rounded-2xl border border-clinic-line bg-white p-4 shadow-soft">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-clinic-mint text-clinic-teal">
          <HeartPulse className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-navy-900">CareFlow</p>
          <p className="text-xs text-clinic-muted">For Newcastle Medical Centre</p>
        </div>
      </Link>

      <nav className="space-y-2">
        {roleLinks.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active ? "bg-clinic-teal text-white shadow-soft" : "text-navy-700 hover:bg-clinic-blue hover:text-navy-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-clinic-line bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clinic-teal">Privacy-first</p>
        <p className="mt-2 text-sm leading-6 text-clinic-muted">
          Public screens show anonymous Newcastle codes only. Names stay inside staff tools.
        </p>
      </div>
    </aside>
  );
}
