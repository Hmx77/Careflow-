"use client";

import { useEffect, useRef } from "react";

export function PrintTicketClient({ number }: { number: string }) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;

    async function printWhenReady() {
      const images = Array.from(document.images);

      await Promise.all(
        images.map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );

      await Promise.all(images.map((image) => image.decode?.().catch(() => undefined) ?? Promise.resolve()));

      window.requestAnimationFrame(() => {
        window.focus();
        window.print();
      });
    }

    function closeAfterPrint() {
      window.setTimeout(() => window.close(), 250);
    }

    window.addEventListener("afterprint", closeAfterPrint);
    void printWhenReady();

    return () => window.removeEventListener("afterprint", closeAfterPrint);
  }, []);

  return (
    <>
      <style>{`
        @page {
          size: 57mm 52mm;
          margin: 0;
        }

        html,
        body {
          width: 57mm;
          height: 52mm;
          min-width: 0 !important;
          min-height: 52mm !important;
          max-width: 57mm;
          max-height: 52mm;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #fff !important;
        }

        body {
          color: #000 !important;
          font-family: Arial, Helvetica, sans-serif;
        }

        .thermal-ticket {
          width: 57mm;
          height: 52mm;
          box-sizing: border-box;
          overflow: hidden;
          padding: 3mm 2mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          color: #000;
          background: #fff;
        }

        .thermal-ticket-logo {
          display: block;
          width: 14mm;
          height: auto;
          max-height: 14mm;
          margin: 0 0 1.5mm;
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
          margin: 0;
          color: #000;
          font-size: 34pt;
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: 0;
          white-space: nowrap;
        }
      `}</style>
      <main className="thermal-ticket" aria-label={`Queue ticket ${number}`}>
        <img className="thermal-ticket-logo" src="/images/nmc-logo.png" alt="Newcastle Medical Centre logo" />
        <div className="thermal-ticket-practice">Newcastle Medical Centre</div>
        <div className="thermal-ticket-label">Queue Number</div>
        <div className="thermal-ticket-number">{number}</div>
      </main>
    </>
  );
}
