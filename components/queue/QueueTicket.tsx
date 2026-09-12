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
    const existingFrame = document.getElementById("careflow-ticket-print-frame");
    existingFrame?.remove();

    const printFrame = document.createElement("iframe");
    const logoUrl = new URL("/images/nmc-logo.png", window.location.origin).toString();

    printFrame.id = "careflow-ticket-print-frame";
    printFrame.title = "Queue ticket print frame";
    printFrame.setAttribute("aria-hidden", "true");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";
    printFrame.style.pointerEvents = "none";

    printFrame.srcdoc = `<!doctype html>
<html>
  <head>
    <title>Queue Ticket</title>
    <meta charset="utf-8" />
    <style>
      @page {
        size: 57mm 52mm;
        margin: 0;
      }

      html,
      body {
        width: 57mm;
        height: 52mm;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: white;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
      }

      .thermal-ticket {
        box-sizing: border-box;
        width: 57mm;
        height: 52mm;
        padding: 4mm 2mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        page-break-after: avoid;
        page-break-inside: avoid;
        break-inside: avoid;
        text-align: center;
      }

      .thermal-ticket-logo {
        display: block;
        width: 14mm;
        height: auto;
        max-height: 14mm;
        margin: 0 auto 1.5mm;
        object-fit: contain;
      }

      .thermal-ticket-practice {
        margin: 0 0 3mm;
        font-size: 9pt;
        font-weight: 700;
        line-height: 1.15;
      }

      .thermal-ticket-label {
        margin: 0 0 1.5mm;
        font-size: 8pt;
        font-weight: 700;
        line-height: 1.2;
      }

      .thermal-ticket-number {
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
    <main class="thermal-ticket">
      <img class="thermal-ticket-logo" src="${logoUrl}" alt="Newcastle Medical Centre logo" />
      <div class="thermal-ticket-practice">Newcastle Medical Centre</div>
      <div class="thermal-ticket-label">Queue Number</div>
      <div class="thermal-ticket-number">${escapeHtml(code)}</div>
    </main>
  </body>
</html>`;

    printFrame.addEventListener("load", () => {
      const frameWindow = printFrame.contentWindow;
      const frameDocument = printFrame.contentDocument;

      if (!frameWindow || !frameDocument) return;

      const cleanup = () => window.setTimeout(() => printFrame.remove(), 250);
      const images = Array.from(frameDocument.images);
      const imageLoads = images.map(
        (image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
      );

      void Promise.all(imageLoads)
        .then(() => Promise.all(images.map((image) => image.decode?.().catch(() => undefined) ?? Promise.resolve())))
        .then(() => {
          frameWindow.addEventListener("afterprint", cleanup, { once: true });
          frameWindow.focus();
          frameWindow.print();
          window.setTimeout(cleanup, 5000);
        });
    });

    document.body.appendChild(printFrame);
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
