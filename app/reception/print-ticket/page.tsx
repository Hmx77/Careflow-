import { PrintTicketClient } from "./print-ticket-client";

export default function ReceptionPrintTicketPage({
  searchParams
}: {
  searchParams?: { number?: string };
}) {
  const queueNumber = sanitizeQueueNumber(searchParams?.number);

  return <PrintTicketClient number={queueNumber} />;
}

function sanitizeQueueNumber(value: string | undefined) {
  const normalized = (value || "001").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return normalized || "001";
}
