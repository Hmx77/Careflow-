"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NMCLogo from "@/components/NMCLogo";
import { getNextPatients, getNowServing } from "@/lib/queueUtils";
import type { Patient } from "@/lib/types";

export function WaitingRoomScreen({ patients, message }: { patients: Patient[]; message: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const nowServing = getNowServing(patients);
  const nextPatients = getNextPatients(patients, 5);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="display-bg flex min-h-screen flex-col p-6 text-navy-900 sm:p-8 lg:p-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4">
          <NMCLogo className="w-fit max-w-full" />
          <h1 className="mt-2 text-6xl font-black tracking-tight sm:text-7xl">CareFlow</h1>
        </div>
        <div className="rounded-3xl border border-clinic-line bg-white px-8 py-5 text-right shadow-soft">
          <p className="text-sm uppercase tracking-[0.22em] text-clinic-muted">Current clinic time</p>
          <p className="mt-2 text-5xl font-black">{now ? now.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" }) : "Loading"}</p>
        </div>
      </div>

      <div className="mt-10 grid flex-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-clinic-line bg-white p-6 shadow-soft">
          <p className="mb-5 text-3xl font-bold text-navy-700">Now Serving</p>
          <AnimatePresence mode="wait">
            {nowServing ? (
              <motion.div
                key={nowServing.code}
                initial={{ y: 18 }}
                animate={{ y: 0 }}
                exit={{ y: -18 }}
                className="rounded-[1.7rem] bg-white px-7 py-8 text-navy-900 shadow-glass"
              >
                <p className="whitespace-nowrap text-7xl font-black tracking-tight sm:text-8xl">{nowServing.code}</p>
                <p className="mt-5 text-4xl font-bold leading-tight text-clinic-teal">
                  Please proceed to the Nurse Station
                </p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[1.7rem] border border-clinic-line bg-clinic-blue p-8 text-3xl font-semibold text-clinic-muted">
                Waiting for next patient.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-[2rem] border border-clinic-line bg-white p-6 shadow-soft">
          <p className="mb-5 text-3xl font-bold text-navy-700">Next Numbers</p>
          <div className="grid gap-4">
            {nextPatients.map((patient) => (
              <motion.div key={patient.id} layout className="rounded-[1.5rem] border border-clinic-line bg-clinic-blue px-7 py-6 text-5xl font-black text-navy-900">
                {patient.code}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-clinic-line bg-white p-5 text-center text-2xl font-semibold text-clinic-muted shadow-soft">
        {message}
      </div>
    </section>
  );
}
