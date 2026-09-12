"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarClock, Menu, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import NMCLogo from "@/components/NMCLogo";
import { RoleNav } from "./RoleNav";
import { useQueueStore } from "@/lib/useQueueStore";

export function AppShell({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  const { activePatients } = useQueueStore();
  const [now, setNow] = useState<Date | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1680px] gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <RoleNav />
        <div className="min-w-0 flex-1">
          <header className="glass-panel rounded-2xl px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen((open) => !open)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-clinic-line bg-white lg:hidden"
                  aria-label="Toggle navigation"
                >
                  <Menu className="h-5 w-5 text-clinic-teal" />
                </button>
                <NMCLogo className="shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
                    <span className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-bold text-clinic-teal">
                      For Newcastle Medical Centre
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-clinic-muted">{eyebrow ?? "Shakhbout City, Abu Dhabi patient flow system"}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
                <HeaderBadge label="Privacy Mode" value="Enabled" icon={<ShieldCheck className="h-4 w-4" />} />
                <HeaderBadge
                  label="Current Time"
                  value={now ? now.toLocaleString("en-AE", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "Loading"}
                  icon={<CalendarClock className="h-4 w-4" />}
                />
                <HeaderBadge label="Active Patients" value={`${activePatients.length} active`} icon={<UsersRound className="h-4 w-4" />} />
              </div>
            </div>

            {mobileOpen && (
              <div className="mt-4 grid gap-2 border-t border-clinic-line pt-4 lg:hidden">
                {[
                  ["/", "Overview"],
                  ["/reception", "Reception"],
                  ["/nurse", "Nurse Station"],
                  ["/display", "Display"],
                  ["/analytics", "Analytics"],
                  ["/admin", "Admin"],
                  ["/settings", "Settings"],
                  ["/check-in", "Check-in"]
                ].map(([href, label]) => (
                  <Link key={href} href={href} prefetch={false} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-clinic-blue">
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </header>

          <motion.main
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="pt-5"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}

function HeaderBadge({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-clinic-line bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-clinic-muted">{label}</p>
      <p className="mt-1 flex items-center gap-2 font-bold text-navy-900">
        <span className="text-clinic-teal">{icon}</span>
        {value}
      </p>
    </div>
  );
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-clinic-mint to-white px-4 py-5">
      <div className="mx-auto max-w-md">
        <Link href="/" prefetch={false} className="mb-5 flex justify-center">
          <NMCLogo className="w-full" />
        </Link>
        {children}
      </div>
    </div>
  );
}
