import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useSyncExternalStore } from "react";

export type QueueStatus = "waiting" | "called" | "in_progress" | "completed" | "delayed";
export type QueuePriority = "normal" | "urgent" | "follow_up";

export type QueueItem = {
  id: string;
  code: string;
  createdAt: number;
  status: QueueStatus;
  priority: QueuePriority;
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
  internal_reference: string | null;
  phone_number: string | null;
};

type QueueSnapshot = {
  configured: boolean;
  loading: boolean;
  error: string;
  items: QueueItem[];
};

const supabaseUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
const configError = getConfigError();
const isConfigured = !configError;

const clearedQueueMarker = "__careflow_cleared__";
const clearedQueueMarkerPrefix = "__careflow_cleared__:";
const completedQueueMarkerPrefix = "__careflow_completed__:";
const clearedQueueReferencePrefix = "__careflow_cleared_public_code__:";

const listeners = new Set<() => void>();
let didStart = false;
let supabase: SupabaseClient | null = null;
let pollingTimer: number | undefined;
let snapshot: QueueSnapshot = {
  configured: isConfigured,
  loading: isConfigured,
  error: configError,
  items: [],
};

export function useQueueStore() {
  useEffect(() => {
    startQueueStore();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export async function createQueueItem(input: {
  priority?: QueuePriority;
  optionalInternalReference?: string;
  optionalPhoneNumber?: string;
}) {
  try {
    const client = requireSupabase();
    const code = await nextQueueCode();
    await archiveCompletedCodeCollision(code);
    const { data, error } = await withTimeout(
      client
        .from("queue")
        .insert({
          code,
          status: "waiting",
          priority: input.priority ?? "normal",
          room_location: "Nurse Station",
          internal_reference: input.optionalInternalReference?.trim() || null,
          phone_number: input.optionalPhoneNumber?.trim() || null,
        })
        .select("id, code, created_at, status, priority, room_location, internal_reference, phone_number")
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

async function archiveCompletedCodeCollision(code: string) {
  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client
      .from("queue")
      .select("id, code, created_at, status, priority, room_location, internal_reference, phone_number")
      .eq("code", code)
      .eq("status", "completed"),
    "Preparing queue number timed out.",
  );

  if (error) throw error;

  const rows = data || [];
  if (!rows.length) return;

  const results = await Promise.all(
    rows.map((row) =>
      withTimeout(
        client
          .from("queue")
          .update({
            code: archiveQueueCode(row.id),
            room_location: row.room_location?.startsWith(clearedQueueMarkerPrefix)
              ? row.room_location
              : `${completedQueueMarkerPrefix}${formatQueueCode(row)}`,
          })
          .eq("id", row.id),
        "Preparing queue number timed out.",
      ),
    ),
  );
  const updateError = results.find((result) => result.error)?.error;
  if (updateError) throw updateError;
}

export async function updateQueueStatus(id: string, status: QueueStatus) {
  try {
    const patch: Partial<QueueRow> = { status };
    const current = snapshot.items.find((item) => item.id === id);
    if (status === "called") patch.room_location = "Nurse Station";
    if (status === "completed" && current) {
      patch.code = archiveQueueCode(current.id);
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
    const updates = snapshot.items
      .filter((item) => item.status === "called" || item.id === id)
      .map((item) =>
        withTimeout(
          client
            .from("queue")
            .update(
              item.id === id
                ? { status: "called", room_location: "Nurse Station" }
                : { status: "in_progress" },
            )
            .eq("id", item.id),
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

export async function callNextQueueItem() {
  const next = getWaitingQueue(snapshot.items)[0];
  if (next) await callQueueItem(next.id);
}

export async function clearAllQueueItems() {
  try {
    const client = requireSupabase();
    const { data, error: loadError } = await withTimeout(
      client
        .from("queue")
        .select("id, code, created_at, status, priority, room_location, internal_reference, phone_number"),
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
              code: `NC-${archiveSeed}${String(index).padStart(3, "0")}`,
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

export function getWaitingQueue(items: QueueItem[]) {
  return sortQueue(items.filter((item) => item.status === "waiting"));
}

export function getNowServing(items: QueueItem[]) {
  const active = getActiveQueue(items);
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
  return item.status === "completed" && (item.roomLocation === clearedQueueMarker || item.roomLocation.startsWith(clearedQueueMarkerPrefix));
}

export function formatQueueCode(itemOrCode: QueueItem | QueueRow | string) {
  if (typeof itemOrCode !== "string") {
    const isQueueItem = "roomLocation" in itemOrCode;
    const roomLocation = isQueueItem ? itemOrCode.roomLocation : itemOrCode.room_location;
    const internalReference = isQueueItem ? itemOrCode.optionalInternalReference : itemOrCode.internal_reference;
    if (roomLocation?.startsWith(clearedQueueMarkerPrefix)) {
      return roomLocation.replace(clearedQueueMarkerPrefix, "");
    }
    if (roomLocation?.startsWith(completedQueueMarkerPrefix)) {
      return roomLocation.replace(completedQueueMarkerPrefix, "");
    }
    if (roomLocation === clearedQueueMarker && internalReference?.startsWith(clearedQueueReferencePrefix)) {
      return internalReference.replace(clearedQueueReferencePrefix, "");
    }
  }

  const code = typeof itemOrCode === "string" ? itemOrCode : itemOrCode.code;
  const value = numericQueueCode(code);
  return String(value || 1).padStart(3, "0");
}

export function storageQueueCode(input: string) {
  const value = numericQueueCode(input);
  return `NC-${String(value || 1).padStart(3, "0")}`;
}

export function findQueueItemByCode(items: QueueItem[], input: string) {
  const normalized = storageQueueCode(input);
  const publicCode = formatQueueCode(normalized);
  return items.find((item) => item.code === normalized) ||
    items.find((item) => item.status === "completed" && formatQueueCode(item) === publicCode);
}

function startQueueStore() {
  if (didStart || !isConfigured) return;
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
        .select("id, code, created_at, status, priority, room_location, internal_reference, phone_number")
        .order("created_at", { ascending: true }),
      "Loading queue timed out.",
    );

    if (error) throw error;

    setSnapshot({ configured: true, loading: false, error: "", items: sortQueue((data || []).map(fromRow)) });
  } catch (error) {
    logSupabaseError("fetchQueue", error);
    setSnapshot({ ...snapshot, loading: false, error: normalizeError(error).message });
  }
}

async function nextQueueCode() {
  const { data, error } = await withTimeout(
    requireSupabase()
      .from("queue")
      .select("id, code, created_at, status, priority, room_location, internal_reference, phone_number")
      .neq("status", "completed")
      .order("created_at", { ascending: true }),
    "Generating queue code timed out.",
  );
  if (error) {
    logSupabaseError("nextQueueCode", error);
    throw error;
  }

  const highest = sortQueue((data || []).map(fromRow)).reduce((max, row) => {
    const value = numericQueueCode(row.code);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `NC-${String(highest + 1).padStart(3, "0")}`;
}

function fromRow(row: QueueRow): QueueItem {
  return {
    id: row.id,
    code: row.code,
    createdAt: new Date(row.created_at).getTime(),
    status: row.status,
    priority: row.priority,
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

function getSnapshot() {
  return snapshot;
}

function setSnapshot(next: QueueSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function sortQueue(items: QueueItem[]) {
  return [...items].sort((a, b) => a.createdAt - b.createdAt);
}

function numericQueueCode(code: string) {
  const match = code.trim().toUpperCase().match(/(?:NC-)?(\d+)$/);
  const value = Number(match?.[1]);
  return Number.isFinite(value) ? value : 0;
}

function shouldArchiveRow(row: QueueRow) {
  if (row.room_location === clearedQueueMarker || row.room_location?.startsWith(clearedQueueMarkerPrefix)) return false;
  return numericQueueCode(row.code) > 0;
}

function archiveQueueCode(id: string) {
  const idNumber = Number.parseInt(id.replace(/\D/g, "").slice(0, 6), 10) || Math.floor(Math.random() * 999999);
  return `NC-${Date.now()}${String(idNumber).padStart(6, "0")}`;
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
