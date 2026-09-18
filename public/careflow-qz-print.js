(() => {
  const QZ_PRINTER_STORAGE_KEY = "careflow-qz-printer";
  const thermalTicketWidthMm = 57;
  const thermalTicketHeightMm = 52;
  const mmToPt = 72 / 25.4;
  const preferredPrinterNames = ["Printer POS-80", "POS-80", "POS80", "EZPOS"];

  let resolvedPrinter = null;
  let printing = false;
  let securityConfigured = false;

  function onReceptionPage() {
    return window.location.pathname.startsWith("/reception");
  }

  function getQz() {
    const qz = window.qz;
    if (!qz) throw new Error("QZ Tray library is not loaded.");
    return qz;
  }

  function configureSecurity(qz) {
    if (securityConfigured) return;

    // QZ Tray supports resolver-style promises. Keep these handlers as normal
    // functions (not async functions) so QZ receives the certificate/signature
    // through resolve(), matching the official signing examples.
    qz.security.setCertificatePromise(function(resolve, reject) {
      fetch("/api/qz-certificate", {
        cache: "no-store",
        headers: { "Content-Type": "text/plain" },
      })
        .then(function(response) {
          if (!response.ok) {
            return response.text().then(function(message) {
              throw new Error(message || "Could not load QZ certificate.");
            });
          }
          return response.text();
        })
        .then(resolve)
        .catch(reject);
    }, { rejectOnFailure: true });

    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise(function(toSign) {
      return function(resolve, reject) {
        fetch("/api/qz-sign", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body: toSign,
        })
          .then(function(response) {
            if (!response.ok) {
              return response.text().then(function(message) {
                throw new Error(message || "Could not sign QZ request.");
              });
            }
            return response.text();
          })
          .then(resolve)
          .catch(reject);
      };
    });

    securityConfigured = true;
  }

  async function ensureConnected() {
    const qz = getQz();
    configureSecurity(qz);
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 1, delay: 0.5 });
    }
    return qz;
  }

  async function resolvePrinter(qz) {
    if (resolvedPrinter) return resolvedPrinter;

    const saved = window.localStorage.getItem(QZ_PRINTER_STORAGE_KEY);
    if (saved) {
      try {
        const found = await qz.printers.find(saved);
        if (found) {
          resolvedPrinter = found;
          return found;
        }
      } catch (_) {
        window.localStorage.removeItem(QZ_PRINTER_STORAGE_KEY);
      }
    }

    const allPrintersRaw = await qz.printers.find();
    const allPrinters = Array.isArray(allPrintersRaw) ? allPrintersRaw : [allPrintersRaw].filter(Boolean);
    const normalized = allPrinters.map((name) => ({ name, lower: String(name).toLowerCase() }));

    for (const preferred of preferredPrinterNames) {
      const match = normalized.find((printer) => printer.lower.includes(preferred.toLowerCase()));
      if (match) {
        resolvedPrinter = match.name;
        window.localStorage.setItem(QZ_PRINTER_STORAGE_KEY, match.name);
        return match.name;
      }
    }

    if (typeof qz.printers.getDefault === "function") {
      const defaultPrinter = await qz.printers.getDefault();
      if (defaultPrinter) {
        resolvedPrinter = defaultPrinter;
        window.localStorage.setItem(QZ_PRINTER_STORAGE_KEY, defaultPrinter);
        return defaultPrinter;
      }
    }

    throw new Error("Could not find the POS-80 printer in QZ Tray.");
  }

  async function createTicketPdfBase64(queueNumber) {
    if (!window.PDFLib) {
      throw new Error("PDF ticket generator is not loaded.");
    }

    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdfDocument = await PDFDocument.create();
    const pageWidth = thermalTicketWidthMm * mmToPt;
    const pageHeight = thermalTicketHeightMm * mmToPt;
    const page = pdfDocument.addPage([pageWidth, pageHeight]);
    const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const clinicFontSize = 10.5;
    const labelFontSize = 8.8;
    const numberFontSize = 35;
    const clinicGap = 4.5 * mmToPt;
    const labelGap = 3 * mmToPt;
    const clinicHeight = boldFont.heightAtSize(clinicFontSize);
    const labelHeight = boldFont.heightAtSize(labelFontSize);
    const numberHeight = boldFont.heightAtSize(numberFontSize);
    const contentHeight = clinicHeight + clinicGap + labelHeight + labelGap + numberHeight;
    let cursorY = pageHeight - (pageHeight - contentHeight) / 2;

    drawCenteredText(page, boldFont, "Newcastle Medical Centre", clinicFontSize, cursorY - clinicHeight, pageWidth, black);
    cursorY -= clinicHeight + clinicGap;

    drawCenteredText(page, boldFont, "Queue Number", labelFontSize, cursorY - labelHeight, pageWidth, black);
    cursorY -= labelHeight + labelGap;

    drawCenteredText(page, boldFont, queueNumber, numberFontSize, cursorY - numberHeight, pageWidth, black);

    const pdfBytes = await pdfDocument.save();
    return uint8ArrayToBase64(pdfBytes);
  }

  function drawCenteredText(page, font, text, size, y, pageWidth, color) {
    page.drawText(text, {
      x: (pageWidth - font.widthOfTextAtSize(text, size)) / 2,
      y,
      size,
      font,
      color,
    });
  }

  function uint8ArrayToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
    }
    return window.btoa(binary);
  }

  async function printQueueTicket(queueNumber) {
    if (!queueNumber || printing) return;
    printing = true;

    try {
      const qz = await ensureConnected();
      const printer = await resolvePrinter(qz);
      const pdfBase64 = await createTicketPdfBase64(queueNumber);
      const config = qz.configs.create(printer, {
        units: "mm",
        size: {
          width: thermalTicketWidthMm,
          height: thermalTicketHeightMm,
          custom: true,
        },
        margins: 0,
        orientation: "portrait",
        scaleContent: false,
        rasterize: false,
      });

      await qz.print(config, [
        {
          type: "pixel",
          format: "pdf",
          flavor: "base64",
          data: pdfBase64,
        },
      ]);
    } finally {
      printing = false;
    }
  }

  function currentQueueNumber() {
    const element = document.querySelector(".ticket-panel > strong");
    const number = element?.textContent?.trim() || "";
    return /^[A-Z]?\d{3,}$/.test(number) ? number : "";
  }

  function isPrintButton(button) {
    return /print small ticket|reprint ticket|printer unavailable/i.test(button?.textContent || "");
  }

  async function waitForNewQueueNumber(previousNumber) {
    const timeoutAt = Date.now() + 5000;

    while (Date.now() < timeoutAt) {
      const current = currentQueueNumber();
      if (current && current !== previousNumber) {
        try {
          await printQueueTicket(current);
        } catch (error) {
          console.error("CareFlow QZ auto-print failed:", error);
        }
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
  }

  document.addEventListener(
    "submit",
    (event) => {
      if (!onReceptionPage()) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.classList.contains("staff-panel")) return;

      const previousNumber = currentQueueNumber();
      void waitForNewQueueNumber(previousNumber);
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (!onReceptionPage()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!button || !isPrintButton(button)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const number = currentQueueNumber();
      if (!number) return;

      void printQueueTicket(number).catch((error) => {
        console.error("CareFlow QZ reprint failed:", error);
      });
    },
    true,
  );

  window.CareFlowQzPrinter = {
    printQueueTicket,
    clearSavedPrinter() {
      resolvedPrinter = null;
      window.localStorage.removeItem(QZ_PRINTER_STORAGE_KEY);
    },
  };
})();
