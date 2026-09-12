"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { appointmentTypes, departments, doctors } from "@/lib/mockData";
import { useQueueStore } from "@/lib/useQueueStore";
import type { Patient, PatientPriority } from "@/lib/types";

export default function CheckInPage() {
  const { addPatient } = useQueueStore();
  const router = useRouter();
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    appointmentType: appointmentTypes[0],
    doctor: doctors[0].name,
    department: doctors[0].department,
    priority: "normal" as PatientPriority,
    notes: ""
  });

  return (
    <AppShell title="Self Check-in" eyebrow="Patient check-in for Newcastle Medical Centre">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.name.trim() || !consent) return;
            const patient = addPatient(form);
            setCreatedPatient(patient);
            setForm({ ...form, name: "", phone: "", notes: "" });
            window.setTimeout(() => router.push(`/patient/${patient.code}`), 700);
          }}
          className="glass-panel rounded-2xl p-6"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clinic-teal">Patient self check-in</p>
          <h2 className="mt-1 text-3xl font-bold text-navy-900">Check in for your visit</h2>
          <p className="mt-3 text-clinic-muted">This kiosk creates a private Newcastle code and patient status link.</p>

          <div className="mt-6 space-y-4">
            <Field label="Full name">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4" />
            </Field>
            <Field label="Phone number">
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4" />
            </Field>
            <Field label="Appointment type">
              <select value={form.appointmentType} onChange={(event) => setForm({ ...form, appointmentType: event.target.value })} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4">
                {appointmentTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4">
                {departments.map((department) => <option key={department}>{department}</option>)}
              </select>
            </Field>
            <Field label="Doctor / department">
              <select value={form.doctor} onChange={(event) => {
                const doctor = doctors.find((item) => item.name === event.target.value);
                setForm({ ...form, doctor: event.target.value, department: doctor?.department ?? form.department });
              }} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4">
                {doctors.map((doctor) => <option key={doctor.id}>{doctor.name}</option>)}
              </select>
            </Field>
            <Field label="Optional notes">
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-24 w-full rounded-2xl border border-clinic-line bg-white px-4 py-3" />
            </Field>
            <label className="flex gap-3 rounded-2xl border border-clinic-line bg-clinic-blue p-4 text-sm font-semibold text-navy-700">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-clinic-teal" />
              I understand I will be called using my private queue code.
            </label>
          </div>

          <button type="submit" disabled={!consent} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-clinic-teal px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-5 w-5" />
            Generate private code
          </button>
        </form>

        <section className="glass-panel rounded-2xl p-6">
          {createdPatient ? (
            <div>
              <CheckCircle2 className="h-12 w-12 text-clinic-success" />
              <h2 className="mt-4 text-3xl font-bold text-navy-900">You are checked in</h2>
              <p className="mt-3 text-clinic-muted">Your private queue code is:</p>
              <p className="mt-4 text-6xl font-black text-navy-900">{createdPatient.code}</p>
              <p className="mt-3 font-semibold text-clinic-muted">You will be called by this code, not your name. Redirecting to your private queue page...</p>
              <Link href={`/patient/${createdPatient.code}`} className="mt-6 inline-flex rounded-2xl bg-clinic-teal px-5 py-3 font-bold text-white">
                Open patient status link
              </Link>
            </div>
          ) : (
            <div>
              <ShieldCheck className="h-12 w-12 text-clinic-teal" />
              <h2 className="text-3xl font-bold text-navy-900">Your private code is created here</h2>
              <p className="mt-3 leading-7 text-clinic-muted">
                Submit the form and CareFlow will add you to the live queue, calculate your position, and open your private patient status page.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-navy-800">{label}</span>
      {children}
    </label>
  );
}
