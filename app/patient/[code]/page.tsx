"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ClipboardList, HelpCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { PatientShell } from "@/components/layout/AppShell";
import { PatientProgress } from "@/components/queue/PatientProgress";
import { StatusBadge } from "@/components/queue/StatusBadge";
import { NEWCASTLE } from "@/lib/mockData";
import { getPatientMessage } from "@/lib/queueUtils";
import { useQueueStore } from "@/lib/useQueueStore";

export default function PatientPage() {
  const params = useParams<{ code: string }>();
  const { hydrated, patients } = useQueueStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const code = String(params.code ?? "").toUpperCase();
  const patient = patients.find((item) => item.code.toUpperCase() === code);

  if (!hydrated) {
    return (
      <PatientShell>
        <div className="glass-panel rounded-3xl p-6 text-center">
          <h1 className="text-2xl font-black text-navy-900">Loading your queue status</h1>
          <p className="mt-3 text-clinic-muted">CareFlow is retrieving your private Newcastle queue code.</p>
        </div>
      </PatientShell>
    );
  }

  if (!patient) {
    return (
      <PatientShell>
        <div className="glass-panel rounded-3xl p-6 text-center">
          <h1 className="text-2xl font-black text-navy-900">Patient code not found</h1>
          <p className="mt-3 text-clinic-muted">Please check your Newcastle private waiting code or contact reception for help.</p>
          <Link href="/check-in" className="mt-5 inline-flex items-center justify-center rounded-2xl bg-clinic-teal px-5 py-3 font-bold text-white">
            Return to check-in
          </Link>
        </div>
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <motion.div key={refreshCount} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] border border-clinic-line bg-white shadow-glass">
          <div className="bg-gradient-to-br from-white via-clinic-blue to-clinic-mint px-6 pb-7 pt-6 text-navy-900">
            <p className="text-sm font-semibold text-navy-700">Your private waiting code</p>
            <p className="mt-2 text-5xl font-black tracking-tight">{patient.code}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <StatusBadge status={patient.status} />
              {patient.status === "consultation" && <p className="text-sm font-bold text-clinic-teal">{patient.room}</p>}
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3">
            </div>
            <div className="rounded-3xl bg-clinic-mint p-4 text-navy-700">
              <p className="text-sm font-semibold">Appointment type</p>
              <p className="mt-1 text-lg font-bold">{patient.appointmentType}</p>
              <p className="mt-3 text-sm leading-6">{getPatientMessage(patient)} You will be called by your private code.</p>
            </div>
            <PatientProgress status={patient.status} />
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setRefreshCount((count) => count + 1)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-clinic-teal px-5 py-3 font-bold text-white">
                <RefreshCw className="h-5 w-5" />
                Refresh Status
              </button>
              <button type="button" onClick={() => setHelpOpen((open) => !open)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-clinic-line bg-white px-5 py-3 font-bold text-navy-700">
                <HelpCircle className="h-5 w-5" />
                Need Help?
              </button>
            </div>
            <Link href="/check-in" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-clinic-line bg-white px-5 py-3 font-bold text-navy-700">
              <ClipboardList className="h-5 w-5" />
              Back to Check-in
            </Link>
            {helpOpen && (
              <div className="rounded-2xl border border-clinic-line bg-clinic-blue p-4 text-sm leading-6 text-clinic-muted">
                Please speak with Newcastle Medical Centre reception or call {NEWCASTLE.hotline}. Keep this page open for private updates.
              </div>
            )}
          </div>
        </section>
      </motion.div>
    </PatientShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-clinic-line bg-clinic-blue p-4">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-clinic-muted">{label}</p>
      <p className="mt-2 text-3xl font-black text-navy-900">{value}</p>
    </div>
  );
}
