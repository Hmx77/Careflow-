import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  archiveQueueCode,
  clearedQueueMarker,
  clearedQueueMarkerPrefix,
  clearedQueueReferencePrefix,
  completedQueueMarkerPrefix,
  formatQueueCode,
  isClearedQueueRecord,
  isAppointmentCategory,
  isAppointmentCode,
  queueDepartmentForCode,
  numericQueueCode,
  parseQueueCode,
  queueLocationForCode,
  queueTypeLabelForCode,
  queueProceedInstruction,
  storageQueueCode,
} from "./queueCodes";
import type { QueueCategory, QueueCodeStatus, QueueDepartment } from "./queueCodes";

export type QueueStatus = QueueCodeStatus;
export type QueuePriority = "normal" | "urgent" | "follow_up";
export type { QueueCategory, QueueDepartment } from "./queueCodes";
export {
  formatQueueCode,
  isAppointmentCode,
  queueDepartmentForCode,
  queueProceedInstruction,
  queueTypeLabelForCode,
  storageQueueCode,
} from "./queueCodes";

export type QueueItem = {
  id: string;
  code: string;
  createdAt: number;
  status: QueueStatus;
  priority?: QueuePriority;
  roomLocation: string;
  optionalInternalReference?: string;
  optionalPhoneNumber?: string;
};

type QueueRow = {
  id: string;
  code: string;
  created_at: string;
  status: QueueStatus;
  priority: QueuePriority;
  room_location: string | null;
  internal_reference?: string | null;
  phone_number?: string | null;
};

type QueuePrivateRow = {
  queue_id: string;
  patient_name: string;
};

type QueueSnapshot = {
  configured: boolean;
  loading: boolean;
  error: string;
  items: QueueItem[];
};

type StaffAuthSnapshot = {
  configured: boolean;
  loading: boolean;
  error: string;
  session: Session | null;
  authorized: boolean;
};

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
const configError = getConfigError();
const isConfigured = !configError;

const listeners = new Set<() => void>();
const staffAuthListeners = new Set<() => void>();
let didStart = false;
let didStartStaffAuth = false;
let supabase: SupabaseClient | null = null;
let pollingTimer: number | undefined;
let snapshot: QueueSnapshot = {
  configured: isConfigured,
  loading: isConfigured,
  error: configError,
  items: [],
};
let staffAuthSnapshot: StaffAuthSnapshot = {
  configured: isConfigured,
  loading: isConfigured,
  error: configError,
  session: null,
  authorized: false,
};

export function useQueueStore() {
  useEffect(() => {
    startQueueStore();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useStaffSession() {
  useEffect(() => {
    startStaffAuthStore();
  }, []);

  return useSyncExternalStore(subscribeStaffAuth, getStaffAuthSnapshot, getStaffAuthSnapshot);
}

export function useQueuePrivateNames(enabled: boolean) {
  const [state, setState] = useState<{ loading: boolean; error: string; namesByQueueId: Record<string, string> }>({
    loading: enabled,
    error: "",
    namesByQueueId: {},
  });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, error: "", namesByQueueId: {} });
      return;
    }

    let active = true;
    let timer: number | undefined;
    const client = requireSupabase();

    async function loadPrivateNames() {
      try {
        const { data, error } = await withTimeout(
          client.from("queue_private").select("queue_id, patient_name").returns<QueuePrivateRow[]>(),
          "Loading appointment names timed out.",
        );
        if (error) throw error;
        if (!active) return;
        setState({
          loading: false,
          error: "",
          namesByQueueId: Object.fromEntries((data || []).map((row) => [row.queue_id, row.patient_name])),
        });
      } catch (error) {
        if (!active) return;
        logSupabaseError("loadPrivateNames", error);
        setState((current) => ({ ...current, loading: false, error: normalizeError(error).message }));
      }
    }

    void loadPrivateNames();
    timer = window.setInterval(loadPrivateNames, 4000);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [enabled]);

  return state;
}

export async function signInStaff(email: string, password: string) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw normalizeError(error);
}

export async function signOutStaff() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw normalizeError(error);
  setStaffAuthSnapshot({ ...staffAuthSnapshot, session: null, authorized: false, error: "" });
}

export async function createQueueItem(input: {
  category: QueueCategory;
  priority?: QueuePriority;
  patientName?: string;
  optionalInternalReference?: string;
  optionalPhoneNumber?: string;
}) {
  try {
    const client = requireSupabase();
    const patientName = input.patientName?.trim() || "";
    if (isAppointmentCategory(input.category) && !patientName) {
      throw new Error("Patient name is required for appointment queue numbers.");
    }

    const { data, error } = await withTimeout(
      client
        .rpc("careflow_create_queue_item", {
          input_category: input.category,
          input_priority: input.priority ?? "normal",
          input_patient_name: isAppointmentCategory(input.category) ? patientName : null,
          input_internal_reference: input.optionalInternalReference?.trim() || null,
          input_phone_number: input.optionalPhoneNumber?.trim() || null,
        })
        .single<QueueRow>(),
      "Creating queue number timed out.",
    );

    if (error) throw error;
    await fetchQueue();
    return fromRow(data);
  } catch (error) {
    logSupabaseError("createQueueItem", error);
    throw normalizeError(error);
  }
}

export async function updateQueueStatus(id: string, status: QueueStatus) {
  try {
    const patch: Partial<QueueRow> = { status };
    const current = snapshot.items.find((item) => item.id === id);
    if (status === "called" && current) patch.room_location = queueLocationForCode(current.code);
    if (status === "completed" && current) {
      patch.code = archiveQueueCode(current.id, current.code);
      patch.room_location = `${completedQueueMarkerPrefix}${formatQueueCode(current)}`;
    }

    const { error } = await withTimeout(
      requireSupabase().from("queue").update(patch).eq("id", id),
      "Updating queue status timed out.",
    );
    if (error) throw error;
    await fetchQueue();
  } catch (error) {
    logSupabaseError("updateQueueStatus", error);
    throw normalizeError(error);
  }
}

export async function callQueueItem(id: string) {
  try {
    const client = requireSupabase();
    const target = snapshot.items.find((item) => item.id === id);
    if (!target) return;
    const department = queueDepartmentForCode(target.code);

    const updates = snapshot.items
      .filter((item) => item.status === "called" && queueDepartmentForCode(item.code) === department && item.id !== id)
      .map((item) =>
        withTimeout(
          client.from("queue").update({ status: "in_progress" }).eq("id", item.id),
          "Calling queue code timed out.",
        ),
      );

    updates.push(
      withTimeout(
        client
          .from("queue")
          .update({ status: "called", room_location: queueLocationForCode(target.code) })
          .eq("id", id)
          .in("status", ["waiting", "called", "delayed", "in_progress"]),
        "Calling queue code timed out.",
      ),
    );

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;
    if (error) throw error;
    await fetchQueue();
  } catch (error) {
    logSupabaseError("callQueueItem", error);
    throw normalizeError(error);
  }
}

export async function callNextQueueItem(department?: QueueDepartment) {
  const next = getWaitingQueue(snapshot.items, department)[0];
  if (next) await callQueueItem(next.id);
}

export async function clearAllQueueItems() {
  try {
    const client = requireSupabase();
    const { data, error: loadError } = await withTimeout(
      client
        .from("queue")
        .select(publicQueueSelect())
        .returns<QueueRow[]>(),
      "Loading queue before clearing timed out.",
    );

    if (loadError) throw loadError;

    const rowsToArchive = (data || []).filter((row) => shouldArchiveRow(row));
    const archiveSeed = Date.now();
    const results = await Promise.all(
      rowsToArchive.map((row, index) =>
        withTimeout(
          client
            .from("queue")
            .update({
              code: archiveQueueCode(`${row.id}${archiveSeed}${index}`, row.code),
              status: "completed",
              room_location: `${clearedQueueMarkerPrefix}${formatQueueCode(row)}`,
              internal_reference: `${clearedQueueReferencePrefix}${formatQueueCode(row)}`,
            })
            .eq("id", row.id),
          "Clearing queue timed out.",
        ),
      ),
    );
    const error = results.find((result) => result.error)?.error;
    if (error) throw error;
    await fetchQueue();
  } catch (error) {
    logSupabaseError("clearAllQueueItems", error);
    throw normalizeError(error);
  }
}

export function getActiveQueue(items: QueueItem[]) {
  return sortQueue(items.filter((item) => item.status !== "completed" && !isClearedQueueItem(item)));
}

export function getDepartmentQueue(items: QueueItem[], department: QueueDepartment) {
  return getActiveQueue(items).filter((item) => queueDepartmentForCode(item.code) === department);
}

export function getWaitingQueue(items: QueueItem[], department?: QueueDepartment) {
  const waiting = items.filter(
    (item) => item.status === "waiting" && (!department || queueDepartmentForCode(item.code) === department),
  );
  return department ? sortDepartmentWaitingQueue(waiting) : mergeDepartmentWaitingQueues(waiting);
}

export function getNowServing(items: QueueItem[], department?: QueueDepartment) {
  const active = department ? getDepartmentQueue(items, department) : getActiveQueue(items);
  const called = active.filter((item) => item.status === "called");
  return called[called.length - 1] || active.find((item) => item.status === "in_progress");
}

export function getPeopleAhead(items: QueueItem[], code: string) {
  const item = items.find((entry) => entry.code === code);
  if (!item || item.status === "completed") return 0;
  if (item.status === "called" || item.status === "in_progress") return 0;

  const active = getActiveQueue(items);
  const index = active.findIndex((entry) => entry.code === code);
  if (index < 0) return 0;

  return active
    .slice(0, index)
    .filter((entry) => entry.status === "waiting" || entry.status === "called" || entry.status === "in_progress")
    .length;
}

export function getEstimatedWait(items: QueueItem[], code: string) {
  const item = items.find((entry) => entry.code === code);
  if (!item || item.status === "completed") return "";
  if (item.status === "called" || item.status === "in_progress") return "Now";
  return `${Math.max(5, (getPeopleAhead(items, code) + 1) * 8)} min`;
}

export function isClearedQueueItem(item: QueueItem) {
  return isClearedQueueRecord(item);
}

export function findQueueItemByCode(items: QueueItem[], input: string) {
  const parsed = parseQueueCode(input);
  if (!parsed) return undefined;

  const normalized = storageQueueCode(input);
  const publicCode = formatQueueCode(normalized);
  return items.find((item) => item.code === normalized) ||
    items.find((item) => item.status === "completed" && formatQueueCode(item) === publicCode);
}

function startQueueStore() {
  if (didStart) return;
  if (!isConfigured) return;
  didStart = true;
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
  void fetchQueue({ showLoading: true }).catch((error) => {
    logSupabaseError("initial fetchQueue", error);
    setSnapshot({ ...snapshot, loading: false, error: normalizeError(error).message });
  });

  supabase
    .channel("careflow-queue")
    .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => {
      void fetchQueue().catch((error) => {
        logSupabaseError("realtime fetchQueue", error);
        setSnapshot({ ...snapshot, loading: false, error: normalizeError(error).message });
      });
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[CareFlow Supabase] Realtime channel error for table queue.");
        setSnapshot({ ...snapshot, error: "Could not connect to Supabase real-time updates." });
      }
    });

  // Production safety: this backs up Supabase Realtime so phones and display screens recover from missed websocket events.
  pollingTimer = window.setInterval(() => {
    void fetchQueue().catch((error) => {
      logSupabaseError("polling fetchQueue", error);
    });
  }, 4000);
}

async function fetchQueue(options: { showLoading?: boolean } = {}) {
  try {
    const client = requireSupabase();
    if (options.showLoading) setSnapshot({ ...snapshot, loading: true, error: "" });

    const { data, error } = await withTimeout(
      client
        .from("queue")
        .select(publicQueueSelect())
        .order("created_at", { ascending: true })
        .returns<QueueRow[]>(),
      "Loading queue timed out.",
    );

    if (error) throw error;

    setSnapshot({ configured: true, loading: false, error: "", items: sortQueue((data || []).map(fromRow)) });
  } catch (error) {
    logSupabaseError("fetchQueue", error);
    setSnapshot({ ...snapshot, loading: false, error: normalizeError(error).message });
  }
}

function fromRow(row: QueueRow): QueueItem {
  return {
    id: row.id,
    code: row.code,
    createdAt: new Date(row.created_at).getTime(),
    status: row.status,
    priority: row.priority ?? "normal",
    roomLocation: row.room_location || "",
    optionalInternalReference: row.internal_reference || undefined,
    optionalPhoneNumber: row.phone_number || undefined,
  };
}

function requireSupabase() {
  if (!isConfigured) {
    throw new Error(configError);
  }
  if (!supabase) supabase = createClient(supabaseUrl!, supabaseAnonKey!);
  return supabase;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeStaffAuth(listener: () => void) {
  staffAuthListeners.add(listener);
  return () => staffAuthListeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getStaffAuthSnapshot() {
  return staffAuthSnapshot;
}

function setSnapshot(next: QueueSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function setStaffAuthSnapshot(next: StaffAuthSnapshot) {
  staffAuthSnapshot = next;
  staffAuthListeners.forEach((listener) => listener());
}

function startStaffAuthStore() {
  if (didStartStaffAuth || !isConfigured) return;
  didStartStaffAuth = true;
  const client = requireSupabase();

  void loadStaffSession();
  client.auth.onAuthStateChange(() => {
    void loadStaffSession();
  });
}

async function loadStaffSession() {
  try {
    setStaffAuthSnapshot({ ...staffAuthSnapshot, loading: true, error: "" });
    const client = requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    const session = data.session;
    const authorized = session ? await isAuthorizedStaff() : false;
    setStaffAuthSnapshot({ configured: true, loading: false, error: "", session, authorized });
  } catch (error) {
    logSupabaseError("loadStaffSession", error);
    setStaffAuthSnapshot({
      configured: true,
      loading: false,
      error: normalizeError(error).message,
      session: null,
      authorized: false,
    });
  }
}

async function isAuthorizedStaff() {
  const { data, error } = await withTimeout(
    requireSupabase().rpc("careflow_is_staff").returns<boolean>(),
    "Checking staff access timed out.",
  );
  if (error) throw error;
  return Boolean(data);
}

function sortQueue(items: QueueItem[]) {
  return [...items].sort((a, b) => a.createdAt - b.createdAt);
}

function sortDepartmentWaitingQueue(items: QueueItem[]) {
  return [...items].sort((a, b) => {
    const appointmentRank = Number(isAppointmentCode(a.code)) - Number(isAppointmentCode(b.code));
    if (appointmentRank !== 0) return -appointmentRank;
    return a.createdAt - b.createdAt;
  });
}

function mergeDepartmentWaitingQueues(items: QueueItem[]) {
  const queues: Record<QueueDepartment, QueueItem[]> = {
    general: sortDepartmentWaitingQueue(items.filter((item) => queueDepartmentForCode(item.code) === "general")),
    dental: sortDepartmentWaitingQueue(items.filter((item) => queueDepartmentForCode(item.code) === "dental")),
  };
  const merged: QueueItem[] = [];

  while (queues.general.length || queues.dental.length) {
    const general = queues.general[0];
    const dental = queues.dental[0];
    if (!dental || (general && general.createdAt <= dental.createdAt)) {
      merged.push(queues.general.shift()!);
    } else {
      merged.push(queues.dental.shift()!);
    }
  }

  return merged;
}

function publicQueueSelect() {
  return "id, code, created_at, status, room_location";
}

function shouldArchiveRow(row: QueueRow) {
  if (row.room_location === clearedQueueMarker || row.room_location?.startsWith(clearedQueueMarkerPrefix)) return false;
  return numericQueueCode(row.code) > 0;
}

function withTimeout<T>(promise: PromiseLike<T>, message: string, timeoutMs = 10000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error && "message" in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error("Supabase queue request failed.");
}

function logSupabaseError(context: string, error: unknown) {
  console.error(`[CareFlow Supabase] ${context}`, error);
}

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

function getConfigError() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "VITE_SUPABASE_URL must start with https:// or http://.";
    }
  } catch {
    return "VITE_SUPABASE_URL is invalid. Use the Project URL from Supabase settings.";
  }

  return "";
}
