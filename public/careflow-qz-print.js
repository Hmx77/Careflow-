(() => {
  const QZ_PRINTER_STORAGE_KEY = "careflow-qz-printer";
  const AUTO_PRINTED_STORAGE_KEY = "careflow-qz-last-auto-printed";
  const preferredPrinterNames = ["Printer POS-80", "POS-80", "POS80", "EZPOS"];

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
    if (qz.websocket.isActive()) return qz;
    await qz.websocket.connect({ retries: 3, delay: 1 });
    return qz;
  }

  async function resolvePrinter(qz) {
    const saved = window.localStorage.getItem(QZ_PRINTER_STORAGE_KEY);
    if (saved) {
      try {
        const found = await qz.printers.find(saved);
        if (found) return found;
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
        window.localStorage.setItem(QZ_PRINTER_STORAGE_KEY, match.name);
        return match.name;
      }
    }

    if (typeof qz.printers.getDefault === "function") {
      const defaultPrinter = await qz.printers.getDefault();
      if (defaultPrinter) {
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
      ESC + "@",              // initialize printer
      ESC + "a" + "\x01",   // center alignment
      ESC + "E" + "\x01",   // bold on
      "NEWCASTLE MEDICAL CENTRE\n",
      ESC + "E" + "\x00",   // bold off
      "\nQUEUE NUMBER\n",
      GS + "!" + "\x33",    // 4x width, 4x height
      `${queueNumber}\n`,
      GS + "!" + "\x00",    // normal text size
      "\nPlease wait for your number to be called.\n",
      "\n\n\n",
      GS + "V" + "\x00",    // full cut
    ];
  }

  async function printQueueTicket(queueNumber) {
    const qz = await ensureConnected();
    const printer = await resolvePrinter(qz);
    const config = qz.configs.create(printer, { encoding: "CP437" });
    await qz.print(config, ticketData(queueNumber));
  }

  function currentQueueNumber() {
    const element = document.querySelector(".ticket-panel > strong");
    const number = element?.textContent?.trim() || "";
    return /^\d{3,}$/.test(number) ? number : "";
  }

  function findPrintButton() {
    return Array.from(document.querySelectorAll("button")).find((button) =>
      /print small ticket|reprint ticket|printing|printer unavailable/i.test(button.textContent || ""),
    );
  }

  function setPrintButtonLabel(label) {
    const button = findPrintButton();
    if (!button) return;
    const textNodes = Array.from(button.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    if (textNodes.length) {
      textNodes[textNodes.length - 1].textContent = `\n                ${label}\n              `;
    } else {
      button.append(document.createTextNode(label));
    }
  }

  async function runPrint(queueNumber, automatic) {
    if (!queueNumber) return;
    setPrintButtonLabel("Printing...");
    try {
      await printQueueTicket(queueNumber);
      setPrintButtonLabel("Reprint ticket");
      if (automatic) {
        window.sessionStorage.setItem(AUTO_PRINTED_STORAGE_KEY, queueNumber);
      }
    } catch (error) {
      console.error("CareFlow QZ printing failed:", error);
      setPrintButtonLabel("Printer unavailable — Reprint");
    }
  }

  function maybeAutoPrint() {
    if (!onReceptionPage()) return;
    const number = currentQueueNumber();
    if (!number) return;

    const lastAutoPrinted = window.sessionStorage.getItem(AUTO_PRINTED_STORAGE_KEY);
    if (lastAutoPrinted === number) {
      setPrintButtonLabel("Reprint ticket");
      return;
    }

    void runPrint(number, true);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!onReceptionPage()) return;
      const button = event.target.closest?.("button");
      if (!button) return;
      if (!/print small ticket|reprint ticket|printer unavailable/i.test(button.textContent || "")) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void runPrint(currentQueueNumber(), false);
    },
    true,
  );

  const observer = new MutationObserver(() => {
    if (!onReceptionPage()) return;
    setPrintButtonLabel("Reprint ticket");
    maybeAutoPrint();
  });

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    maybeAutoPrint();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.CareFlowQzPrinter = {
    printQueueTicket,
    clearSavedPrinter() {
      window.localStorage.removeItem(QZ_PRINTER_STORAGE_KEY);
    },
  };
})();
