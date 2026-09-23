export type QueueCodeStatus = "waiting" | "called" | "in_progress" | "completed" | "delayed";
export type QueueCategory = "dental_walk_in" | "general_walk_in" | "dental_appointment" | "general_appointment";
export type QueueDepartment = "dental" | "general";
export type QueuePrefix = "AD" | "AG" | "D" | "G" | "NC";

export type QueueCodeRecord = {
  code: string;
  status?: QueueCodeStatus;
  roomLocation?: string | null;
  room_location?: string | null;
  optionalInternalReference?: string | null;
  internal_reference?: string | null;
};

export const clearedQueueMarker = "__careflow_cleared__";
export const clearedQueueMarkerPrefix = "__careflow_cleared__:";
export const completedQueueMarkerPrefix = "__careflow_completed__:";
export const clearedQueueReferencePrefix = "__careflow_cleared_public_code__:";

export function nextQueueCodeForSession(rows: QueueCodeRecord[], category: QueueCategory) {
  const prefix = queuePrefixForCategory(category);
  const highest = rows.reduce((max, row) => {
    if (isClearedQueueRecord(row)) return max;

    const parsed = parseQueueCode(formatQueueCode(row));
    return parsed?.prefix === prefix && Number.isFinite(parsed.number) ? Math.max(max, parsed.number) : max;
  }, 0);

  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

export function queueLocationForCategory(category: QueueCategory) {
  return queueDepartmentForCategory(category) === "dental" ? "Dental Clinic" : "Nurse Station";
}

export function queueLocationForCode(code: string) {
  const parsed = parseQueueCode(formatQueueCode(code));
  return parsed?.prefix === "D" || parsed?.prefix === "AD" ? "Dental Clinic" : "Nurse Station";
}

export function queueProceedInstruction(code: string) {
  return `Please proceed to ${queueLocationForCode(code)}`;
}

export function isClearedQueueRecord(row: QueueCodeRecord) {
  const roomLocation = getRoomLocation(row);
  return row.status === "completed" && (roomLocation === clearedQueueMarker || roomLocation.startsWith(clearedQueueMarkerPrefix));
}

export function formatQueueCode(itemOrCode: QueueCodeRecord | string) {
  if (typeof itemOrCode !== "string") {
    const roomLocation = getRoomLocation(itemOrCode);
    const internalReference = getInternalReference(itemOrCode);
    if (roomLocation.startsWith(clearedQueueMarkerPrefix)) {
      return roomLocation.replace(clearedQueueMarkerPrefix, "");
    }
    if (roomLocation.startsWith(completedQueueMarkerPrefix)) {
      return roomLocation.replace(completedQueueMarkerPrefix, "");
    }
    if (roomLocation === clearedQueueMarker && internalReference?.startsWith(clearedQueueReferencePrefix)) {
      return internalReference.replace(clearedQueueReferencePrefix, "");
    }
  }

  const code = typeof itemOrCode === "string" ? itemOrCode : itemOrCode.code;
  const parsed = parseQueueCode(code);
  if (parsed && parsed.prefix !== "NC") {
    return `${parsed.prefix}${String(parsed.number || 1).padStart(3, "0")}`;
  }

  return String(parsed?.number || 1).padStart(3, "0");
}

export function storageQueueCode(input: string) {
  const parsed = parseQueueCode(input);
  const value = parsed?.number || 1;
  if (parsed && parsed.prefix !== "NC") {
    return `${parsed.prefix}-${String(value).padStart(3, "0")}`;
  }
  return `NC-${String(value).padStart(3, "0")}`;
}

export function numericQueueCode(code: string) {
  return parseQueueCode(code)?.number || 0;
}

export function archiveQueueCode(id: string, originalCode: string) {
  const prefix = queuePrefixFromCode(originalCode);
  const idDigits = id.replace(/\D/g, "");
  const rowSeed = `${idDigits.slice(0, 6)}${idDigits.slice(-6)}` || String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `${prefix}-${Date.now()}${rowSeed}`;
}

export function queueDepartmentForCategory(category: QueueCategory): QueueDepartment {
  return category === "dental_walk_in" || category === "dental_appointment" ? "dental" : "general";
}

export function queueDepartmentForCode(code: string): QueueDepartment {
  const prefix = queuePrefixFromCode(code);
  return prefix === "D" || prefix === "AD" ? "dental" : "general";
}

export function isAppointmentCategory(category: QueueCategory) {
  return category === "general_appointment" || category === "dental_appointment";
}

export function isAppointmentCode(code: string) {
  const prefix = queuePrefixFromCode(code);
  return prefix === "AG" || prefix === "AD";
}

export function queueTypeLabelForCode(code: string) {
  const prefix = queuePrefixFromCode(code);
  if (prefix === "AG") return "General Appointment";
  if (prefix === "AD") return "Dental Appointment";
  if (prefix === "D") return "Dental Walk-in";
  return "General Walk-in";
}

function queuePrefixForCategory(category: QueueCategory): Exclude<QueuePrefix, "NC"> {
  if (category === "dental_appointment") return "AD";
  if (category === "general_appointment") return "AG";
  return category === "dental_walk_in" ? "D" : "G";
}

function queuePrefixFromCode(code: string): QueuePrefix {
  return parseQueueCode(code)?.prefix ?? "NC";
}

export function parseQueueCode(code: string): { prefix: QueuePrefix; number: number } | null {
  const clean = code.trim().toUpperCase().replace(/\s+/g, "");
  const prefixed = clean.match(/^(AD|AG|D|G|NC)-?(\d+)$/);
  const numericOnly = clean.match(/^(\d+)$/);
  const prefix = prefixed?.[1] as QueuePrefix | undefined;
  const rawNumber = prefixed?.[2] ?? numericOnly?.[1];
  const value = Number(rawNumber);

  if (!Number.isFinite(value) || value <= 0) return null;
  return { prefix: prefix ?? "NC", number: value };
}

function getRoomLocation(row: QueueCodeRecord) {
  return row.roomLocation ?? row.room_location ?? "";
}

function getInternalReference(row: QueueCodeRecord) {
  return row.optionalInternalReference ?? row.internal_reference;
}
