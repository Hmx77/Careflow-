import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Bell, Check, Clock, Copy, KeyRound, LayoutDashboard, Monitor, Printer, QrCode, Search, Shield, Stethoscope, Ticket, Trash2, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  callNextQueueItem,
  callQueueItem,
  clearAllQueueItems,
  createQueueItem,
  getActiveQueue,
  getDepartmentQueue,
  findQueueItemByCode,
  formatQueueCode,
  getNowServing,
  getWaitingQueue,
  isAppointmentCode,
  isClearedQueueItem,
  QueueCategory,
  QueueDepartment,
  QueueItem,
  queueDepartmentForCode,
  queueProceedInstruction,
  QueueStatus,
  signInStaff,
  signOutStaff,
  queueTypeLabelForCode,
  updateQueueStatus,
  useQueuePrivateNames,
  useQueueStore,
  useStaffSession,
} from "./queueStore";
import "./styles.css";

const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || "https://careflow-newcastle.vercel.app").replace(/\/$/, "");

type StaffQueueItem = QueueItem & { patientName?: string };

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? "brand-compact" : ""}`} to="/" aria-label="CareFlow home">
      <span className="brand-logo-frame">
        <img className="brand-logo" src="/newcastle-medical-centre-logo.png" alt="Newcastle Medical Centre logo" />
      </span>
      <span className="brand-copy">
        <strong>Newcastle Medical Centre</strong>
        <small>CareFlow Queue Management System</small>
      </span>
    </Link>
  );
}

function Shell({ children, mode = "default" }: { children: React.ReactNode; mode?: "default" | "patient" | "display" }) {
  return <main className={`app-shell app-shell-${mode}`}>{children}</main>;
}

function LandingPage() {
  const steps = [
    { icon: Users, title: "Register at reception", text: "The reception team completes registration first." },
    { icon: Ticket, title: "Receive your private queue code", text: "The receptionist creates your queue number." },
    { icon: Clock, title: "Track your turn privately", text: "Use your private link and watch the queue display screen." },
  ];

  return (
    <Shell>
      <section className="landing-hero">
        <div className="hero-copy">
          <BrandMark />
          <h1>CareFlow helps Newcastle Medical Centre manage patient waiting privately after reception registration.</h1>
          <p>A focused queue system for reception, patients, and the queue display.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/reception">
              <LayoutDashboard size={22} />
              Open Reception Dashboard
            </Link>
            <Link className="button button-secondary" to="/display">
              <Monitor size={22} />
              Open Queue Display
            </Link>
            <Link className="button button-secondary" to="/join">
              <Search size={22} />
              Enter Queue Code
            </Link>
          </div>
        </div>
      </section>
      <section className="step-grid" aria-label="How CareFlow works">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article className="step-card" key={step.title}>
              <Icon size={34} />
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          );
        })}
      </section>
    </Shell>
  );
}

function JoinPage() {
  const [code, setCode] = React.useState("");
  const navigate = useNavigate();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (clean) navigate(`/q/${clean}`);
  }

  return (
    <Shell mode="patient">
      <section className="patient-card join-card">
        <BrandMark />
        <h1>Enter your queue code</h1>
        <p>Use this page only if you need to type the code from your ticket.</p>
        <form onSubmit={submit} className="join-form">
          <label htmlFor="queue-code">Queue code</label>
          <input id="queue-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="AG001 or G001" autoComplete="off" />
          <button className="button button-primary button-full" type="submit">
            <Search size={22} />
            View my queue status
          </button>
        </form>
      </section>
    </Shell>
  );
}

function PatientQueuePage() {
  const { code = "" } = useParams();
  const queue = useQueueStore();
  const { items } = queue;
  const item = findQueueItemByCode(items, code);

  if (!queue.configured) {
    return <SupabaseSetupScreen mode="patient" />;
  }

  if (queue.loading) {
    return <LoadingScreen mode="patient" />;
  }

  if (queue.error) {
    return <ErrorScreen message={queue.error} mode="patient" />;
  }

  if (!item) {
    return (
      <Shell mode="patient">
        <section className="patient-card">
          <BrandMark />
          <div className="not-found-panel">
            <h1>Queue code not found</h1>
            <p>Please check your queue code or ask reception for help.</p>
            <Link className="button button-primary button-full" to="/join">Enter Queue Code</Link>
          </div>
        </section>
      </Shell>
    );
  }

  const isCleared = isClearedQueueItem(item);
  const status = patientStatusText(item.status, isCleared);

  return (
    <Shell mode="patient">
      <section className="patient-card">
        <BrandMark />
        <div className="queue-number-block">
          <span>Your Queue Number</span>
          <strong>{formatQueueCode(item)}</strong>
        </div>
        <div className="patient-status-card">
          <span>Current status</span>
          <strong>{status}</strong>
        </div>
        <div className="instruction-box">
          <Shield size={24} />
          <p>{patientInstruction(item.status, isCleared)}</p>
        </div>
      </section>
    </Shell>
  );
}

function ReceptionPage() {
  const queue = useQueueStore();
  const { items } = queue;
  const activeQueue = getActiveQueue(items);
  const privateNames = useQueuePrivateNames(queue.configured);
  const activeStaffQueue = withPrivateNames(activeQueue, privateNames.namesByQueueId);
  const waitingQueue = getWaitingQueue(items);
  const [patientName, setPatientName] = React.useState("");
  const [optionalInternalReference, setOptionalInternalReference] = React.useState("");
  const [optionalPhoneNumber, setOptionalPhoneNumber] = React.useState("");
  const [created, setCreated] = React.useState<QueueItem | null>(null);
  const [qrVisible, setQrVisible] = React.useState(false);
  const [copyState, setCopyState] = React.useState("Copy patient link");
  const [actionError, setActionError] = React.useState("");
  const [clearModalOpen, setClearModalOpen] = React.useState(false);
  const [clearingQueue, setClearingQueue] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const patientLink = created ? `${publicAppUrl}/q/${formatQueueCode(created)}` : "";

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setActionError("");
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const category = submitter?.value as QueueCategory | undefined;
    if (!category) {
      setActionError("Choose the queue type before creating a queue number.");
      return;
    }
    const isAppointment = category === "general_appointment" || category === "dental_appointment";
    if (isAppointment && !patientName.trim()) {
      setActionError("Enter the appointment patient's name before creating an appointment queue number.");
      return;
    }
    try {
      const item = await createQueueItem({
        category,
        patientName,
        optionalInternalReference,
        optionalPhoneNumber,
      });
      setCreated(item);
      setQrVisible(false);
      setCopyState("Copy patient link");
      setPatientName("");
      setOptionalInternalReference("");
      setOptionalPhoneNumber("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not create queue number.");
    }
  }

  async function copyLink() {
    if (!patientLink) return;
    await navigator.clipboard.writeText(patientLink);
    setCopyState("Link copied");
  }

  function openSmallTicket() {
    if (!created) return;
    const number = encodeURIComponent(formatQueueCode(created));
    const printWindow = window.open(
      `/reception/print-ticket?number=${number}`,
      "careflow-ticket-print",
      "popup,width=320,height=360,noopener,noreferrer",
    );

    if (printWindow) {
      printWindow.focus();
    }
  }

  async function runAction(action: () => Promise<void>) {
    setActionError("");
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Queue action failed.");
    }
  }

  async function confirmClearQueue() {
    setClearingQueue(true);
    setActionError("");
    try {
      await clearAllQueueItems();
      setCreated(null);
      setQrVisible(false);
      setClearModalOpen(false);
      setToast({ type: "success", message: "Queue cleared successfully." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Could not clear the queue." });
    } finally {
      setClearingQueue(false);
    }
  }

  if (!queue.configured) {
    return <SupabaseSetupScreen />;
  }

  if (queue.loading) {
    return <LoadingScreen />;
  }

  if (queue.error) {
    return <ErrorScreen message={queue.error} />;
  }

  return (
    <Shell>
      <header className="dashboard-header">
        <BrandMark />
        <div className="header-actions">
          <button className="button button-primary compact-button" onClick={() => runAction(callNextQueueItem)} disabled={!waitingQueue.length} type="button">
            <Ticket size={20} />
            Call next
          </button>
          <Link className="text-link" to="/nurse">Nurse</Link>
          <Link className="text-link" to="/dental">Dental</Link>
          <Link className="text-link" to="/display">Queue display</Link>
        </div>
      </header>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}
      {privateNames.error && <div className="toast toast-error" role="status">{privateNames.error}</div>}
      <StaffSearchPanel items={activeStaffQueue} placeholder="Search patient name or queue number" />
      <section className="dashboard-grid">
        <form className="staff-panel" onSubmit={submit}>
          <h1>Create Queue Number</h1>
          <div className="queue-create-groups">
            <section className="queue-create-group" aria-label="General queue creation">
              <h2>General</h2>
              <button className="button button-secondary button-full" name="category" value="general_walk_in" type="submit">
                <Ticket size={22} />
                General Walk-in
              </button>
              <button className="button button-primary button-full" name="category" value="general_appointment" type="submit">
                <Ticket size={22} />
                General Appointment
              </button>
            </section>
            <section className="queue-create-group" aria-label="Dental queue creation">
              <h2>Dental</h2>
              <button className="button button-secondary button-full" name="category" value="dental_walk_in" type="submit">
                <Ticket size={22} />
                Dental Walk-in
              </button>
              <button className="button button-primary button-full" name="category" value="dental_appointment" type="submit">
                <Ticket size={22} />
                Dental Appointment
              </button>
            </section>
          </div>
          <label>
            Patient name <span>required for AG / AD, optional for G / D</span>
            <input value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Patient name" autoComplete="off" />
          </label>
          <label>
            Optional internal reference <span>staff-only</span>
            <input value={optionalInternalReference} onChange={(event) => setOptionalInternalReference(event.target.value)} placeholder="Reference" />
          </label>
          <label>
            Optional phone number <span>staff-only</span>
            <input value={optionalPhoneNumber} onChange={(event) => setOptionalPhoneNumber(event.target.value)} placeholder="Phone number" />
          </label>
          {actionError && <p className="form-error">{actionError}</p>}
        </form>

        {created ? (
          <aside className="ticket-panel">
            <h2>Queue created</h2>
            <strong>{formatQueueCode(created)}</strong>
            {qrVisible && (
              <div className="qr-box">
                <QRCodeSVG value={patientLink} size={132} />
              </div>
            )}
            <div className="ticket-actions">
              <button className="button button-secondary" onClick={copyLink} type="button">
                <Copy size={20} />
                {copyState}
              </button>
              <button className="button button-secondary" onClick={() => setQrVisible((value) => !value)} type="button">
                <QrCode size={20} />
                Show QR code
              </button>
              <button className="button button-secondary" onClick={openSmallTicket} type="button">
                <Printer size={20} />
                Print small ticket
              </button>
              <a className="button button-secondary" href={patientLink} target="_blank" rel="noreferrer">
                <Check size={20} />
                Open patient page
              </a>
            </div>
          </aside>
        ) : (
          <aside className="ticket-panel quiet-panel">
            <h2>No queue number selected</h2>
            <p>Create a queue number to show the private link and QR code.</p>
          </aside>
        )}
      </section>

      <section className="queue-table-section">
        <div className="section-title-row">
          <h2>Active queue</h2>
          <div className="section-actions">
            <button
              className="button button-danger compact-button"
              disabled={!activeQueue.length || clearingQueue}
              onClick={() => setClearModalOpen(true)}
              type="button"
            >
              <Trash2 size={18} />
              Clear All Queue
            </button>
          </div>
        </div>
        {activeQueue.length ? (
          <div className="queue-table" role="table" aria-label="Reception queue table">
            <div className="queue-row queue-head" role="row">
              <span>Code</span>
              <span>Type</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {activeQueue.map((item) => (
              <QueueTableRow item={item} runAction={runAction} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No active queue yet.</h3>
            <p>Create the first queue number from reception.</p>
          </div>
        )}
      </section>
      {clearModalOpen && (
        <ConfirmClearModal
          activeCount={activeQueue.length}
          clearing={clearingQueue}
          onCancel={() => setClearModalOpen(false)}
          onConfirm={confirmClearQueue}
        />
      )}
    </Shell>
  );
}

function TicketPrintPage() {
  const number = getTicketNumberFromSearch();
  const logoRef = React.useRef<HTMLImageElement | null>(null);
  const printedRef = React.useRef(false);

  React.useEffect(() => {
    document.title = `Queue Number ${number}`;

    function printTicket() {
      if (printedRef.current) return;
      printedRef.current = true;
      window.setTimeout(() => window.print(), 150);
    }

    function closeAfterPrint() {
      if (window.opener) {
        window.setTimeout(() => window.close(), 250);
      }
    }

    const logo = logoRef.current;
    window.addEventListener("afterprint", closeAfterPrint);

    if (logo && !logo.complete) {
      logo.addEventListener("load", printTicket, { once: true });
      logo.addEventListener("error", printTicket, { once: true });
    } else {
      printTicket();
    }

    return () => {
      window.removeEventListener("afterprint", closeAfterPrint);
      logo?.removeEventListener("load", printTicket);
      logo?.removeEventListener("error", printTicket);
    };
  }, [number]);

  return (
    <main className="print-ticket-page" aria-label={`Queue ticket ${number}`}>
      <section className="thermal-ticket">
        <img ref={logoRef} className="thermal-ticket-logo" src="/newcastle-medical-centre-logo.png" alt="Newcastle Medical Centre logo" />
        <div className="thermal-ticket-practice">Newcastle Medical Centre</div>
        <div className="thermal-ticket-label">Queue Number</div>
        <div className="thermal-ticket-number">{number}</div>
      </section>
    </main>
  );
}

function getTicketNumberFromSearch() {
  const searchParams = new URLSearchParams(window.location.search);
  const rawNumber = searchParams.get("number") || "";
  return rawNumber.replace(/[^\dA-Za-z-]/g, "").slice(0, 12) || "001";
}

function ConfirmClearModal({
  activeCount,
  clearing,
  onCancel,
  onConfirm,
}: {
  activeCount: number;
  clearing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="clear-queue-title">
        <div className="confirm-icon">
          <AlertTriangle size={30} />
        </div>
        <h2 id="clear-queue-title">Clear All Queue</h2>
        <p>Are you sure you want to clear all queue numbers? This action cannot be undone.</p>
        <small>{activeCount} active queue number{activeCount === 1 ? "" : "s"} will be cleared.</small>
        <div className="modal-actions">
          <button className="button button-secondary" disabled={clearing} onClick={onCancel} type="button">Cancel</button>
          <button className="button button-danger" disabled={clearing} onClick={onConfirm} type="button">
            {clearing ? "Clearing..." : "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}

function StaffSearchPanel({
  items,
  department,
  placeholder,
}: {
  items: StaffQueueItem[];
  department?: QueueDepartment;
  placeholder: string;
}) {
  const [query, setQuery] = React.useState("");
  const results = React.useMemo(() => searchQueueItems(items, query, department), [items, query, department]);
  const hasQuery = Boolean(query.trim());

  return (
    <section className="staff-search-panel" aria-label="Staff queue search">
      <label htmlFor={`staff-search-${department || "all"}`}>
        <Search size={20} />
        <input
          id={`staff-search-${department || "all"}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </label>
      {hasQuery && (
        <div className="search-results">
          {results.length ? (
            results.map((item) => (
              <article className="search-result" key={item.id}>
                <strong>{formatQueueCode(item)}</strong>
                <div>
                  <PatientNameLine item={item} fallback="No appointment name" />
                  <span>{queueTypeLabelForCode(item.code)}</span>
                  <small>{statusLabel(item.status)}{queueAheadText(items, item)}</small>
                </div>
              </article>
            ))
          ) : (
            <p>No active queue match.</p>
          )}
        </div>
      )}
    </section>
  );
}

function NursePage() {
  return <DepartmentStaffPage department="general" title="General Nurse" description="Manage General appointment and walk-in queue numbers." />;
}

function DentalPage() {
  return <DepartmentStaffPage department="dental" title="Dental" description="Manage Dental appointment and walk-in queue numbers." />;
}

function DepartmentStaffPage({
  department,
  title,
  description,
}: {
  department: QueueDepartment;
  title: string;
  description: string;
}) {
  const queue = useQueueStore();
  const { items } = queue;
  const activeQueue = getDepartmentQueue(items, department);
  const privateNames = useQueuePrivateNames(queue.configured);
  const activeStaffQueue = withPrivateNames(activeQueue, privateNames.namesByQueueId);
  const waitingQueue = getWaitingQueue(items, department);
  const waitingStaffQueue = withPrivateNames(waitingQueue, privateNames.namesByQueueId);
  const staffQueue = getStaffDisplayQueue(activeStaffQueue, waitingStaffQueue);
  const nextPatient = waitingStaffQueue[0];
  const [actionError, setActionError] = React.useState("");

  async function runAction(action: () => Promise<void>) {
    setActionError("");
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Queue action failed.");
    }
  }

  if (!queue.configured) {
    return <SupabaseSetupScreen />;
  }

  if (queue.loading) {
    return <LoadingScreen />;
  }

  if (queue.error) {
    return <ErrorScreen message={queue.error} />;
  }

  return (
    <Shell>
      <header className="dashboard-header">
        <BrandMark />
        <div className="header-actions">
          <button className="button button-primary compact-button" onClick={() => runAction(() => callNextQueueItem(department))} disabled={!waitingQueue.length} type="button">
            <Bell size={20} />
            Call next
          </button>
          {department === "general" ? <Link className="text-link" to="/dental">Dental</Link> : <Link className="text-link" to="/nurse">Nurse</Link>}
          <Link className="text-link" to="/display">Queue display</Link>
          <Link className="text-link" to="/reception">Reception</Link>
        </div>
      </header>

      <section className="nurse-panel">
        <div className="nurse-title">
          <div className="nurse-icon">
            <Stethoscope size={28} />
          </div>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        {actionError && <p className="form-error">{actionError}</p>}
        {privateNames.error && <p className="form-error">{privateNames.error}</p>}

        <StaffSearchPanel items={activeStaffQueue} department={department} placeholder="Search patient name or queue number" />

        <section className="next-patient-panel" aria-label={`${title} next patient`}>
          <span>Next Patient</span>
          {nextPatient ? (
            <>
              <strong>{formatQueueCode(nextPatient)}</strong>
              <PatientNameLine item={nextPatient} />
              <p>{queueTypeLabelForCode(nextPatient.code)}</p>
              <button className="button button-primary compact-button" onClick={() => runAction(() => callQueueItem(nextPatient.id))} type="button">
                <Bell size={20} />
                Call {formatQueueCode(nextPatient)}
              </button>
            </>
          ) : (
            <p>No waiting {department} patients.</p>
          )}
        </section>

        {staffQueue.length ? (
          <div className="nurse-list" aria-label="Nurse queue list">
            {staffQueue.map((item) => (
              <NurseQueueCard item={item} runAction={runAction} key={item.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No active queue yet.</h3>
            <p>Create the first queue number from reception.</p>
          </div>
        )}
      </section>
    </Shell>
  );
}

function NurseQueueCard({
  item,
  runAction,
}: {
  item: StaffQueueItem;
  runAction: (action: () => Promise<void>) => void;
}) {
  return (
    <article className="nurse-card">
      <div>
        <span>{queueTypeLabelForCode(item.code)} - {statusLabel(item.status)}</span>
        <strong>{formatQueueCode(item)}</strong>
        <PatientNameLine item={item} />
      </div>
      <div className="nurse-actions" aria-label={`Actions for ${formatQueueCode(item)}`}>
        <button type="button" onClick={() => runAction(() => updateQueueStatus(item.id, "waiting"))}>Waiting</button>
        <button type="button" onClick={() => runAction(() => callQueueItem(item.id))}>Called</button>
        <button type="button" onClick={() => runAction(() => updateQueueStatus(item.id, "in_progress"))}>In Progress</button>
        <button type="button" onClick={() => runAction(() => updateQueueStatus(item.id, "completed"))}>Completed</button>
      </div>
    </article>
  );
}

function QueueTableRow({
  item,
  runAction,
}: {
  item: QueueItem;
  runAction: (action: () => Promise<void>) => void;
}) {
  return (
    <div className="queue-row" role="row">
      <strong>{formatQueueCode(item)}</strong>
      <span>{queueTypeLabelForCode(item.code)}</span>
      <span>{statusLabel(item.status)}</span>
      <div className="row-actions">
        <button type="button" onClick={() => runAction(() => callQueueItem(item.id))}>Call code</button>
        <button type="button" onClick={() => runAction(() => updateQueueStatus(item.id, "waiting"))}>Mark as waiting</button>
        <button type="button" onClick={() => runAction(() => updateQueueStatus(item.id, "in_progress"))}>Mark as in progress</button>
        <button type="button" onClick={() => runAction(() => updateQueueStatus(item.id, "completed"))}>Complete</button>
        <button type="button" onClick={() => runAction(() => updateQueueStatus(item.id, "delayed"))}>Delay</button>
      </div>
    </div>
  );
}

function DisplayPage() {
  const queue = useQueueStore();
  const { items } = queue;
  const generalNowServing = getNowServing(items, "general");
  const dentalNowServing = getNowServing(items, "dental");
  const generalUpcoming = getUpcomingDepartmentItems(items, "general", generalNowServing?.id);
  const dentalUpcoming = getUpcomingDepartmentItems(items, "dental", dentalNowServing?.id);
  const hasInitializedRef = React.useRef(false);
  const lastAnnouncedTicketIdsRef = React.useRef<{ general: string | null; dental: string | null }>({ general: null, dental: null });

  const speechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  React.useEffect(() => {
    if (queue.loading) return;

    if (!hasInitializedRef.current) {
      lastAnnouncedTicketIdsRef.current = {
        general: generalNowServing?.id ?? null,
        dental: dentalNowServing?.id ?? null,
      };
      hasInitializedRef.current = true;
      return;
    }

    const changedItem =
      generalNowServing && lastAnnouncedTicketIdsRef.current.general !== generalNowServing.id
        ? generalNowServing
        : dentalNowServing && lastAnnouncedTicketIdsRef.current.dental !== dentalNowServing.id
          ? dentalNowServing
          : null;

    lastAnnouncedTicketIdsRef.current = {
      general: generalNowServing?.id ?? null,
      dental: dentalNowServing?.id ?? null,
    };

    if (!changedItem) return;

    void (async () => {
      const result = await announceTicket(changedItem, speechSupported);
      if (result === "blocked") {
        console.warn("[CareFlow announcements] Browser blocked audio until the display has been interacted with.");
      }
    })();
  }, [generalNowServing?.id, dentalNowServing?.id, queue.loading, speechSupported]);

  if (!queue.configured) {
    return <SupabaseSetupScreen mode="display" />;
  }

  if (queue.loading) {
    return <LoadingScreen mode="display" />;
  }

  if (queue.error) {
    return <ErrorScreen message={queue.error} mode="display" />;
  }

  return (
    <Shell mode="display">
      <section className="display-screen">
        <header className="display-brand">
          <img className="display-logo" src="/newcastle-medical-centre-logo.png" alt="Newcastle Medical Centre logo" />
          <h1>Newcastle Medical Centre</h1>
        </header>

        <div className="display-board display-board-columns">
          <DisplayDepartmentColumn title="General" nowServing={generalNowServing} upcoming={generalUpcoming} />
          <DisplayDepartmentColumn title="Dental" nowServing={dentalNowServing} upcoming={dentalUpcoming} />
        </div>

        <p className="display-instruction">Thank you for your patience</p>
      </section>
    </Shell>
  );
}

function DisplayDepartmentColumn({
  title,
  nowServing,
  upcoming,
}: {
  title: string;
  nowServing?: QueueItem;
  upcoming: QueueItem[];
}) {
  return (
    <section className="department-display display-panel" aria-label={`${title} queue`}>
      <h2>{title}</h2>
      <div className="department-now-serving">
        <span>Now Serving</span>
        {nowServing ? (
          <>
            <strong>{formatQueueCode(nowServing)}</strong>
            <p>{queueProceedInstruction(formatQueueCode(nowServing))}</p>
          </>
        ) : (
          <div className="display-empty">
            <strong>---</strong>
            <p>No code is currently being served</p>
          </div>
        )}
      </div>
      <div className="department-recent">
        <span>Upcoming</span>
        {upcoming.length ? upcoming.map((item) => <strong key={item.id}>{formatQueueCode(item)}</strong>) : <em>No waiting tickets</em>}
      </div>
    </section>
  );
}

async function announceTicket(
  item: QueueItem,
  speechSupported: boolean,
): Promise<"ok" | "blocked"> {
  const message = `Now serving ticket number ${spokenQueueCode(formatQueueCode(item))}.`;

  try {
    const chime = new Audio("/sounds/chime.mp3");
    chime.volume = 0.22;
    await chime.play();
  } catch (error) {
    if (isAutoplayBlocked(error)) {
      return "blocked";
    }
    console.warn("[CareFlow announcements] Chime could not play.", error);
  }

  if (!speechSupported) {
    console.warn("[CareFlow announcements] Speech synthesis is not supported on this browser.");
    return "ok";
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.82;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    if (isAutoplayBlocked(error)) {
      return "blocked";
    }
    console.warn("[CareFlow announcements] Speech announcement failed.", error);
  }

  return "ok";
}

function spokenQueueCode(code: string) {
  const words: Record<string, string> = {
    "0": "zero",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
  };

  return code
    .replace(/-/g, "")
    .split("")
    .map((character) => words[character] ?? character)
    .join(" ");
}

function isAutoplayBlocked(error: unknown) {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
}

function SupabaseSetupScreen({ mode = "default" }: { mode?: "default" | "patient" | "display" }) {
  return (
    <Shell mode={mode}>
      <section className={mode === "display" ? "display-screen setup-display" : "admin-panel setup-panel"}>
        <BrandMark compact={mode === "display"} />
        <h1>Supabase setup required</h1>
        <p>CareFlow now uses Supabase so reception, phones, and the queue display screen share the same queue.</p>
        <div className="setup-steps">
          <p>Add these environment variables locally and in Vercel:</p>
          <code>VITE_SUPABASE_URL</code>
          <code>VITE_SUPABASE_ANON_KEY</code>
          <p>Then run the SQL in <strong>supabase/schema.sql</strong> in your Supabase SQL editor.</p>
        </div>
      </section>
    </Shell>
  );
}

function LoadingScreen({ mode = "default" }: { mode?: "default" | "patient" | "display" }) {
  return (
    <Shell mode={mode}>
      <section className={mode === "display" ? "display-screen setup-display" : "patient-card"}>
        <BrandMark compact={mode === "display"} />
        <h1>Loading queue</h1>
        <p>Connecting to the live queue.</p>
      </section>
    </Shell>
  );
}

function ErrorScreen({ message, mode = "default" }: { message: string; mode?: "default" | "patient" | "display" }) {
  return (
    <Shell mode={mode}>
      <section className={mode === "display" ? "display-screen setup-display" : "patient-card"}>
        <BrandMark compact={mode === "display"} />
        <h1>Queue connection issue</h1>
        <p>{message}</p>
      </section>
    </Shell>
  );
}

function StaffGate({ children }: { children: React.ReactNode }) {
  const staff = useStaffSession();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await signInStaff(email.trim(), password);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.");
    }
  }

  async function signOut() {
    try {
      await signOutStaff();
      setPassword("");
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign out.");
    }
  }

  if (!staff.configured) return <SupabaseSetupScreen />;
  if (staff.loading) return <LoadingScreen />;
  if (staff.session && staff.authorized) return <>{children}</>;

  return (
    <Shell>
      <section className="pin-panel">
        <BrandMark />
        <div className="pin-icon">
          <KeyRound size={30} />
        </div>
        <h1>Staff access</h1>
        <p>Sign in with an authorized staff account to open this page.</p>
        {staff.session && !staff.authorized && (
          <div className="instruction-box">
            <Shield size={22} />
            <p>This account is signed in but is not authorized for CareFlow staff access.</p>
          </div>
        )}
        <form onSubmit={submit} className="pin-form">
          <label htmlFor="staff-email">Email</label>
          <input
            id="staff-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="staff@example.com"
            autoComplete="username"
          />
          <label htmlFor="staff-password">Password</label>
          <input
            id="staff-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          {(error || staff.error) && <span className="pin-error">{error || staff.error}</span>}
          <button className="button button-primary button-full" type="submit">Sign in</button>
          {staff.session && (
            <button className="button button-secondary button-full" type="button" onClick={signOut}>Sign out</button>
          )}
        </form>
      </section>
    </Shell>
  );
}

function statusLabel(status: QueueStatus) {
  const labels: Record<QueueStatus, string> = {
    waiting: "Waiting",
    called: "Called",
    in_progress: "In progress",
    completed: "Completed",
    delayed: "Delayed",
  };
  return labels[status];
}

function PatientNameLine({ item, fallback = "" }: { item: StaffQueueItem; fallback?: string }) {
  const name = item.patientName || (isAppointmentCode(item.code) ? fallback : "");
  return name ? <p>{name}</p> : null;
}

function searchQueueItems(items: StaffQueueItem[], query: string, department?: QueueDepartment) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCodeQuery = normalizeQueueSearchCode(query);
  if (!normalizedQuery) return [];

  return items
    .filter((item) => item.status !== "completed" && !isClearedQueueItem(item))
    .filter((item) => !department || queueDepartmentForCode(item.code) === department)
    .filter((item) => {
      const code = normalizeSearchText(formatQueueCode(item));
      const storageCode = normalizeSearchText(item.code);
      const compactCode = normalizeQueueSearchCode(formatQueueCode(item));
      const compactStorageCode = normalizeQueueSearchCode(item.code);
      const patientName = normalizeSearchText(item.patientName || "");
      return (
        code.includes(normalizedQuery) ||
        storageCode.includes(normalizedQuery) ||
        compactCode.includes(normalizedCodeQuery) ||
        compactStorageCode.includes(normalizedCodeQuery) ||
        patientName.includes(normalizedQuery)
      );
    })
    .slice(0, 8);
}

function queueAheadText(items: QueueItem[], item: QueueItem) {
  if (item.status !== "waiting") return "";
  const waiting = getWaitingQueue(items, queueDepartmentForCode(item.code));
  const ahead = waiting.findIndex((entry) => entry.id === item.id);
  if (ahead <= 0) return "";
  const noun = isAppointmentCode(item.code) ? "appointment" : "patient";
  return ` - ${ahead} ${noun}${ahead === 1 ? "" : "s"} ahead`;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeQueueSearchCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function withPrivateNames(items: QueueItem[], namesByQueueId: Record<string, string>): StaffQueueItem[] {
  return items.map((item) => ({ ...item, patientName: namesByQueueId[item.id] }));
}

function getStaffDisplayQueue(activeQueue: StaffQueueItem[], waitingQueue: StaffQueueItem[]) {
  const waitingIds = new Set(waitingQueue.map((item) => item.id));
  return [...waitingQueue, ...activeQueue.filter((item) => !waitingIds.has(item.id))];
}

function getUpcomingDepartmentItems(items: QueueItem[], department: QueueDepartment, currentId?: string) {
  return getWaitingQueue(items, department)
    .filter((item) => item.id !== currentId)
    .slice(0, 4);
}

function patientStatusText(status: QueueStatus, isCleared = false) {
  if (isCleared) return "No longer active";
  if (status === "called" || status === "in_progress") return "It is your turn";
  if (status === "completed") return "Your visit has been completed";
  return statusLabel(status);
}

function patientInstruction(status: QueueStatus, isCleared = false) {
  if (isCleared) return "This ticket is no longer active. Please return to reception.";
  if (status === "called" || status === "in_progress") return "It is your turn. Please follow the queue display screen instructions.";
  if (status === "completed") return "Your visit has been completed. Thank you.";
  if (status === "delayed") return "Please stay nearby. Reception will call your number again.";
  return "You are already registered. Please stay nearby and watch the queue display screen.";
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/q/:code" element={<PatientQueuePage />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route path="/reception" element={<StaffGate><ReceptionPage /></StaffGate>} />
        <Route path="/reception/print-ticket" element={<TicketPrintPage />} />
        <Route path="/nurse" element={<StaffGate><NursePage /></StaffGate>} />
        <Route path="/dental" element={<StaffGate><DentalPage /></StaffGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
