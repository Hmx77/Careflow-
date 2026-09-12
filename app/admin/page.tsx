"use client";

import Link from "next/link";
import { Activity, MonitorUp, RotateCcw, Settings, ShieldCheck, Stethoscope, UserRoundCheck, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/cards/MetricCard";
import { QueueTable } from "@/components/queue/QueueTable";
import { departments } from "@/lib/mockData";
import { useQueueStore } from "@/lib/useQueueStore";

const roleCards = [
  { href: "/reception", label: "Reception", icon: UsersRound },
  { href: "/nurse", label: "Nurse", icon: UserRoundCheck },
  { href: "/doctor", label: "Doctor", icon: Stethoscope },
  { href: "/admin", label: "Admin", icon: Settings },
  { href: "/display", label: "Display", icon: MonitorUp },
  { href: "/patient/NC-204", label: "Patient View", icon: ShieldCheck },
  { href: "/check-in", label: "Self Check-in", icon: UserRoundCheck }
];

export default function AdminPage() {
  const { activePatients, doctors, rooms, settings, updateSettings, resetDemoQueue, setStatus, mode } = useQueueStore();

  return (
    <AppShell title="Admin Control Center" eyebrow="Clinic management overview and controls">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Active patients" value={activePatients.length} icon={<UsersRound />} />
          <MetricCard title="Rooms" value={rooms.length} icon={<MonitorUp />} />
          <MetricCard title="Doctors / teams" value={doctors.length} icon={<Stethoscope />} />
          <MetricCard title="System status" value="Online" icon={<Activity />} tone="green" />
          <MetricCard title="Data mode" value={mode === "supabase" ? "Supabase" : "Demo Mode"} icon={<ShieldCheck />} tone={mode === "supabase" ? "green" : "amber"} />
        </div>

        <section className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clinic-teal">Admin settings</p>
              <h2 className="mt-1 text-2xl font-bold text-navy-900">Queue and system controls</h2>
            </div>
            <button type="button" onClick={resetDemoQueue} className="inline-flex items-center gap-2 rounded-2xl bg-[#FFF1F1] px-5 py-3 font-bold text-clinic-error">
              <RotateCcw className="h-5 w-5" />
              Reset demo queue
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Control label="Privacy mode">
              <button type="button" onClick={() => updateSettings({ ...settings, privacyMode: !settings.privacyMode })} className={`h-10 rounded-full px-4 font-bold ${settings.privacyMode ? "bg-clinic-teal text-white" : "bg-clinic-grey text-clinic-muted"}`}>
                {settings.privacyMode ? "Enabled" : "Disabled"}
              </button>
            </Control>
            <Control label="Average consultation time">
              <input type="range" min={4} max={20} value={settings.averageConsultationTime} onChange={(event) => updateSettings({ ...settings, averageConsultationTime: Number(event.target.value) })} className="w-full accent-clinic-teal" />
              <p className="mt-2 font-bold text-navy-900">{settings.averageConsultationTime} minutes</p>
            </Control>
            <Control label="Default wait-time calculation">
              <select value={settings.defaultWaitCalculation} onChange={(event) => updateSettings({ ...settings, defaultWaitCalculation: event.target.value as typeof settings.defaultWaitCalculation })} className="h-11 w-full rounded-2xl border border-clinic-line bg-white px-4">
                <option value="priority-weighted">Priority weighted</option>
                <option value="standard">Standard</option>
              </select>
            </Control>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roleCards.map((role) => {
            const Icon = role.icon;
            return (
              <Link key={role.href} href={role.href} className="rounded-2xl border border-clinic-line bg-white p-5 shadow-soft transition hover:-translate-y-1">
                <Icon className="h-7 w-7 text-clinic-teal" />
                <p className="mt-4 text-xl font-bold text-navy-900">{role.label}</p>
                <p className="mt-1 text-sm text-clinic-muted">Open role workspace</p>
              </Link>
            );
          })}
        </div>

        <section className="grid gap-4 xl:grid-cols-3">
          <ResourcePanel title="Rooms" subtitle="Clinic rooms and service points">
            {rooms.map((room) => (
              <ResourceLine key={room.id} name={room.name} meta={room.department} status={room.status} />
            ))}
          </ResourcePanel>
          <ResourcePanel title="Doctors" subtitle="Demo doctor and team assignments">
            {doctors.map((doctor) => (
              <ResourceLine key={doctor.id} name={doctor.name} meta={`${doctor.department} - ${doctor.room}`} status={doctor.status} />
            ))}
          </ResourcePanel>
          <ResourcePanel title="Departments" subtitle="Newcastle service routing">
            {departments.map((department) => (
              <ResourceLine key={department} name={department} meta="Available for check-in routing" />
            ))}
          </ResourcePanel>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <h2 className="mb-5 text-2xl font-bold text-navy-900">All active patients</h2>
          <QueueTable patients={activePatients} onStatus={setStatus} compact />
        </section>
      </div>
    </AppShell>
  );
}

function ResourcePanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clinic-teal">{title}</p>
      <h2 className="mt-1 text-xl font-bold text-navy-900">{subtitle}</h2>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function ResourceLine({ name, meta, status }: { name: string; meta: string; status?: string }) {
  return (
    <div className="rounded-2xl border border-clinic-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-navy-900">{name}</p>
          <p className="mt-1 text-sm text-clinic-muted">{meta}</p>
        </div>
        {status && <span className="rounded-full bg-clinic-mint px-3 py-1 text-xs font-bold capitalize text-clinic-teal">{status}</span>}
      </div>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-clinic-line bg-white p-4">
      <p className="mb-3 text-sm font-bold text-navy-900">{label}</p>
      {children}
    </div>
  );
}
