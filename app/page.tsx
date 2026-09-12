"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardList, Clock3, MonitorUp, ShieldCheck, Smartphone, Stethoscope, UserRoundCheck, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const problems = [
  "Patients wait without clear updates",
  "Reception gets repeated questions",
  "Public name-calling creates a privacy concern",
  "Waiting time feels longer when patients are uninformed"
];

const solutions = [
  "Private Newcastle codes such as NC-204",
  "Self check-in for patients at reception",
  "Private patient status page",
  "Live queue status and estimated wait time",
  "Waiting room screen without patient names",
  "Role dashboards for reception, nurses, doctors and admin"
];

const ctas = [
  { href: "/reception", label: "Open Reception", icon: ClipboardList },
  { href: "/check-in", label: "Open Self Check-in", icon: UserRoundCheck },
  { href: "/display", label: "Open Waiting Room Display", icon: MonitorUp },
  { href: "/patient/NC-204", label: "View Patient Demo", icon: Smartphone },
  { href: "/admin", label: "Open Admin", icon: UsersRound }
];

export default function LandingPage() {
  return (
    <AppShell title="CareFlow" eyebrow="Public overview and role entry point">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-clinic-line bg-gradient-to-br from-white via-clinic-blue to-clinic-mint p-6 shadow-glass sm:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-clinic-line bg-white px-4 py-2 text-sm font-semibold text-clinic-muted">
                <ShieldCheck className="h-4 w-4 text-clinic-teal" />
                Privacy-first clinic flow system
              </div>
              <h2 className="max-w-4xl text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
                CareFlow for Newcastle Medical Centre
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-clinic-muted">
                A premium patient waiting and flow management system for Newcastle Medical Centre in Shakhbout City, Abu Dhabi.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {ctas.map((cta) => {
                  const Icon = cta.icon;
                  return (
                    <Link
                      key={cta.href}
                      href={cta.href}
                      prefetch={false}
                      className="inline-flex items-center justify-between rounded-2xl bg-clinic-teal px-5 py-3 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-navy-700"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {cta.label}
                      </span>
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-clinic-line bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold text-navy-700">Now serving privately</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="text-5xl font-black text-navy-900">NC-204</p>
                <div className="rounded-2xl bg-clinic-teal px-4 py-3 text-center text-white">
                  <Stethoscope className="mx-auto h-6 w-6" />
                  <p className="mt-1 text-sm font-bold">Room 2</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["No public names", "Live estimates", "Role dashboards", "Mobile patient link"].map((item) => (
                  <div key={item} className="rounded-2xl bg-clinic-blue p-4">
                    <p className="font-bold text-navy-900">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <InfoSection title="The waiting room problem" icon={<Clock3 className="h-5 w-5" />} items={problems} />
          <InfoSection title="The CareFlow solution" icon={<ShieldCheck className="h-5 w-5" />} items={solutions} />
        </div>
      </div>
    </AppShell>
  );
}

function InfoSection({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <section className="glass-panel rounded-2xl p-5 sm:p-6">
      <h3 className="mb-5 text-2xl font-bold text-navy-900">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <motion.div key={item} whileHover={{ y: -3 }} className="rounded-2xl border border-clinic-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-clinic-mint text-clinic-teal">{icon}</div>
            <p className="font-bold leading-6 text-navy-900">{item}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
