"use client";

import { BarChart3, Check, Clock3, Timer, UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/cards/MetricCard";
import { departments } from "@/lib/mockData";
import { useQueueStore } from "@/lib/useQueueStore";

export default function AnalyticsPage() {
  const { patients, activePatients, completedPatients } = useQueueStore();
  const averageWait = Math.round(activePatients.reduce((sum, patient) => sum + patient.estimatedWaitMinutes, 0) / Math.max(1, activePatients.length));
  const longestWait = Math.max(0, ...activePatients.map((patient) => patient.estimatedWaitMinutes));
  const departmentLoad = departments.slice(0, 8).map((department) => ({
    label: department,
    value: patients.filter((patient) => patient.department === department).length
  }));
  const doctorLoad = Array.from(new Set(patients.map((patient) => patient.doctor).filter(Boolean))).map((doctor) => ({
    label: doctor,
    value: patients.filter((patient) => patient.doctor === doctor).length
  }));
  const statusLoad = ["checked-in", "waiting", "nurse-check", "consultation", "lab-payment", "completed", "delayed"].map((status) => ({
    label: status,
    value: patients.filter((patient) => patient.status === status).length
  }));

  return (
    <AppShell title="Analytics" eyebrow="Management insights and queue performance">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Active patients" value={activePatients.length} icon={<UsersRound />} />
          <MetricCard title="Average wait" value={`${averageWait} min`} icon={<Clock3 />} />
          <MetricCard title="Completed today" value={completedPatients.length} icon={<Check />} tone="green" />
          <MetricCard title="Longest current wait" value={`${longestWait} min`} icon={<Timer />} tone={longestWait > 20 ? "amber" : "blue"} />
          <MetricCard title="Peak queue time" value="10 AM - 12 PM" icon={<BarChart3 />} />
        </div>

        <section className="glass-panel rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-navy-900">Department load</h2>
          <div className="mt-6 space-y-4">
            {departmentLoad.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-clinic-muted">{item.label}</p>
                  <p className="font-bold text-navy-900">{item.value}</p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-clinic-blue">
                  <div className="h-full rounded-full bg-clinic-teal" style={{ width: `${Math.max(8, (item.value / Math.max(1, patients.length)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-2">
          <Breakdown title="Doctor load" items={doctorLoad} total={patients.length} />
          <Breakdown title="Status breakdown" items={statusLoad} total={patients.length} />
        </div>
      </div>
    </AppShell>
  );
}

function Breakdown({ title, items, total }: { title: string; items: Array<{ label?: string; value: number }>; total: number }) {
  return (
    <section className="glass-panel rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-navy-900">{title}</h2>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-semibold capitalize text-clinic-muted">{item.label}</p>
              <p className="font-bold text-navy-900">{item.value}</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-clinic-blue">
              <div className="h-full rounded-full bg-clinic-teal" style={{ width: `${Math.max(8, (item.value / Math.max(1, total)) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
