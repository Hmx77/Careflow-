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
    const printWindow = window.open("", "careflow-queue-ticket", "width=320,height=240");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Queue Ticket</title>
    <style>
      @page {
        size: 57mm 52mm;
        margin: 0;
      }

      html,
      body {
        width: 57mm;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
      }

      .ticket {
        box-sizing: border-box;
        width: 57mm;
        max-width: 57mm;
        padding: 4mm 2mm;
        text-align: center;
        break-inside: avoid;
        page-break-inside: avoid;
        page-break-after: avoid;
      }

      .ticket-logo {
        display: block;
        width: 14mm;
        height: auto;
        max-height: 14mm;
        margin: 0 auto 1.5mm;
        object-fit: contain;
      }

      .ticket-practice {
        margin: 0 0 3mm;
        font-size: 9pt;
        font-weight: 700;
        line-height: 1.15;
      }

      .ticket-label {
        margin: 0 0 1.5mm;
        font-size: 8pt;
        font-weight: 700;
        line-height: 1.2;
      }

      .ticket-number {
        color: #000000;
        font-size: 34pt;
        font-weight: 900;
        line-height: 0.95;
        letter-spacing: 0;
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <main class="ticket">
      <img class="ticket-logo" src="/images/nmc-logo.png" alt="Newcastle Medical Centre logo" />
      <div class="ticket-practice">Newcastle Medical Centre</div>
      <div class="ticket-label">Queue Number</div>
      <div class="ticket-number" id="ticket-number"></div>
    </main>
  </body>
</html>`);
    printWindow.document.close();

    const ticketNumber = printWindow.document.getElementById("ticket-number");
    if (ticketNumber) ticketNumber.textContent = code;

    printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
    printWindow.focus();
    printWindow.print();
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

      <div className="queue-ticket" aria-label={`Queue ticket ${code}`}>
        <img className="queue-ticket-logo" src="/images/nmc-logo.png" alt="Newcastle Medical Centre logo" />
        <div className="queue-ticket-practice">Newcastle Medical Centre</div>
        <div className="queue-ticket-label">Queue Number</div>
        <div className="queue-ticket-number">{code}</div>
      </div>
    </section>
  );
}
