"use client";

import { Mail, MessageCircle, Palette, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { NEWCASTLE } from "@/lib/mockData";
import { useQueueStore } from "@/lib/useQueueStore";

export default function SettingsPage() {
  const { settings, updateSettings, mode } = useQueueStore();

  return (
    <AppShell title="Privacy & System Settings" eyebrow="Dedicated privacy controls and notification simulation">
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="glass-panel rounded-2xl p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clinic-teal">Privacy controls</p>
            <h2 className="mt-1 text-3xl font-bold text-navy-900">Public screens use anonymous codes only</h2>
            <p className="mt-3 max-w-3xl leading-7 text-clinic-muted">
              CareFlow reduces public disclosure in the waiting area by replacing patient names with private Newcastle visit codes.
            </p>
            {mode === "demo" && (
              <span className="mt-4 inline-flex rounded-full bg-[#FFF7E6] px-3 py-1.5 text-xs font-bold text-clinic-warning">
                Demo Mode - queue state is centralized for this browser session
              </span>
            )}
          </div>

          <div className="space-y-4">
            <ToggleRow title="Privacy Mode" body="Public display uses Newcastle codes only." checked={settings.privacyMode} onChange={(privacyMode) => updateSettings({ ...settings, privacyMode })} icon={<ShieldCheck />} />
            <ToggleRow title="SMS simulation" body="Mock patient update confirmations for receptionist demos." checked={settings.smsSimulation} onChange={(smsSimulation) => updateSettings({ ...settings, smsSimulation })} icon={<MessageCircle />} />
            <ToggleRow title="WhatsApp simulation" body="Mock WhatsApp-style notification status for client presentations." checked={settings.whatsappSimulation} onChange={(whatsappSimulation) => updateSettings({ ...settings, whatsappSimulation })} icon={<MessageCircle />} />
            <ToggleRow title="Email simulation" body="Mock email update confirmations for staff demonstrations." checked={settings.emailSimulation} onChange={(emailSimulation) => updateSettings({ ...settings, emailSimulation })} icon={<Mail />} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Clinic name">
              <input value={settings.clinicName} onChange={(event) => updateSettings({ ...settings, clinicName: event.target.value })} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4" />
            </Field>
            <Field label="Accent color">
              <input value={settings.accentColor} onChange={(event) => updateSettings({ ...settings, accentColor: event.target.value })} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Display message">
                <textarea value={settings.displayMessage} onChange={(event) => updateSettings({ ...settings, displayMessage: event.target.value })} className="min-h-24 w-full rounded-2xl border border-clinic-line bg-white px-4 py-3" />
              </Field>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-clinic-mint text-clinic-teal">
            <Palette className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold text-navy-900">Newcastle Information</h3>
          <div className="mt-5 space-y-4 text-clinic-muted">
            <InfoLine label="Location" value={NEWCASTLE.location} />
            <InfoLine label="Hotline" value={NEWCASTLE.hotline} />
            <InfoLine label="Email" value={NEWCASTLE.email} />
            <InfoLine label="Working hours" value={NEWCASTLE.hours} />
          </div>
          <div className="mt-6 rounded-2xl border border-clinic-line bg-clinic-blue p-5">
            <p className="text-sm font-semibold text-navy-700">Public display rules</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-clinic-muted">
              <li>Never show patient names.</li>
              <li>Never show phone numbers.</li>
              <li>Only show Newcastle private codes and room numbers.</li>
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ToggleRow({ title, body, checked, onChange, icon }: { title: string; body: string; checked: boolean; onChange: (checked: boolean) => void; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-clinic-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-clinic-mint text-clinic-teal">{icon}</div>
        <div>
          <p className="font-bold text-navy-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-clinic-muted">{body}</p>
        </div>
      </div>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-8 w-14 rounded-full transition ${checked ? "bg-clinic-teal" : "bg-[#DDE7EC]"}`} aria-pressed={checked}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${checked ? "left-7" : "left-1"}`} />
      </button>
    </div>
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-clinic-line bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-clinic-muted">{label}</p>
      <p className="mt-1 font-bold text-navy-900">{value}</p>
    </div>
  );
}
