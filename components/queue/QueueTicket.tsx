"use client";

import { Printer, X } from "lucide-react";

export function QueueTicket({
  code,
  onClose,
  title = "Patient added successfully"
}: {
  code: string;
  onClose: () => void;
  title?: string;
}) {
  function printTicket() {
    const ticketUrl = `/reception/print-ticket?number=${encodeURIComponent(code)}`;
    const printWindow = window.open(ticketUrl, "careflow-queue-ticket", "popup,width=320,height=360");
    printWindow?.focus();
  }

  return (
    <section className="rounded-2xl border border-clinic-line bg-white p-6 text-center shadow-glass print:contents">
      <div className="print:hidden">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-clinic-line bg-white text-navy-700" aria-label="Close ticket">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-clinic-teal">{title}</p>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-clinic-muted">Queue Number</p>
        <h2 className="mt-3 text-7xl font-black leading-none text-navy-900">{code}</h2>
        <button type="button" onClick={printTicket} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-clinic-teal px-5 text-lg font-black text-white shadow-soft hover:bg-navy-700">
          <Printer className="h-5 w-5" />
          Print Ticket
        </button>
        <button type="button" onClick={onClose} className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-clinic-line bg-white px-5 py-3 font-bold text-navy-700">
          Close
        </button>
      </div>

    </section>
  );
}
