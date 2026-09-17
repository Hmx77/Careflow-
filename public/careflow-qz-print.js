(() => {
  const QZ_PRINTER_STORAGE_KEY = "careflow-qz-printer";
  const preferredPrinterNames = ["Printer POS-80", "POS-80", "POS80", "EZPOS"];

  let resolvedPrinter = null;
  let printing = false;

  function onReceptionPage() {
    return window.location.pathname.startsWith("/reception");
  }

  function getQz() {
    const qz = window.qz;
    if (!qz) throw new Error("QZ Tray library is not loaded.");
    return qz;
  }

  async function ensureConnected() {
    const qz = getQz();
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

  function ticketData(queueNumber) {
    const ESC = "\x1B";
    const GS = "\x1D";

    return [
      ESC + "@",
      ESC + "a" + "\x01",
      ESC + "E" + "\x01",
      "NEWCASTLE MEDICAL CENTRE\n",
      ESC + "E" + "\x00",
      "\nQUEUE NUMBER\n",
      GS + "!" + "\x33",
      `${queueNumber}\n`,
      GS + "!" + "\x00",
      "\nPlease wait to be called.\n",
      "\n\n\n",
      GS + "V" + "\x00",
    ];
  }

  async function printQueueTicket(queueNumber) {
    if (!queueNumber || printing) return;
    printing = true;

    try {
      const qz = await ensureConnected();
      const printer = await resolvePrinter(qz);
      const config = qz.configs.create(printer, { encoding: "CP437" });
      await qz.print(config, ticketData(queueNumber));
    } finally {
      printing = false;
    }
  }

  function currentQueueNumber() {
    const element = document.querySelector(".ticket-panel > strong");
    const number = element?.textContent?.trim() || "";
    return /^\d{3,}$/.test(number) ? number : "";
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
