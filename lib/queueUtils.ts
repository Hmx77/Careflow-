import type { Patient, PatientPriority, PatientStatus, QueueType } from "./types";

export const statusLabels: Record<PatientStatus, string> = {
  "checked-in": "Checked in", waiting: "Waiting", "nurse-check": "At nurse station",
  consultation: "Consultation", "lab-payment": "Lab / payment", completed: "Completed", delayed: "Delayed"
};
export const priorityLabels: Record<PatientPriority, string> = { normal: "Normal", urgent: "Urgent", "follow-up": "Follow-up" };
export const queueTypeLabels: Record<QueueType, string> = { appointment: "Appointment", "walk-in": "Walk-in" };
export const activeStatuses: PatientStatus[] = ["checked-in", "waiting", "nurse-check", "consultation", "lab-payment", "delayed"];
export const queueStatuses: PatientStatus[] = ["checked-in", "waiting", "delayed"];
export const progressSteps: Array<{ key: PatientStatus; label: string }> = [
  { key: "checked-in", label: "Checked in" }, { key: "waiting", label: "Waiting" },
  { key: "nurse-check", label: "Nurse Station" }, { key: "completed", label: "Completed" }
];
const APPOINTMENT_WINDOW_MINUTES = 10;
function sameDay(a: Date,b: Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
export function inferQueueType(patient: Pick<Patient,"queueType"|"code"|"appointmentType">): QueueType {
  if (patient.queueType) return patient.queueType;
  if (patient.code?.toUpperCase().startsWith("A")) return "appointment";
  if (patient.code?.toUpperCase().startsWith("W")) return "walk-in";
  return patient.appointmentType?.toLowerCase().includes("scheduled") ? "appointment" : "walk-in";
}
export function isActivePatient(patient: Patient){return activeStatuses.includes(patient.status)}
export function getActivePatients(patients: Patient[]){return patients.filter(isActivePatient)}
export function generatePatientCode(patients: Patient[], queueType: QueueType = "walk-in", now = new Date()) {
  const prefix = queueType === "appointment" ? "A" : "W";
  let highest = 0;
  for (const p of patients) {
    const d = new Date(p.checkedInAt); if (!Number.isFinite(d.getTime()) || !sameDay(d, now)) continue;
    const m = p.code.match(new RegExp(`^${prefix}(\\d+)$`,"i")); if (m) highest = Math.max(highest, Number(m[1]));
  }
  return `${prefix}${String(highest+1).padStart(3,"0")}`;
}
export const nextPatientCode = generatePatientCode;
export function getQueueEntryTime(patient: Patient) {
  const checkin = new Date(patient.checkedInAt).getTime();
  if (inferQueueType(patient)!=="appointment" || !patient.scheduledAt) return checkin;
  const scheduled = new Date(patient.scheduledAt).getTime(); if (!Number.isFinite(scheduled)) return checkin;
  return Math.max(checkin, scheduled - APPOINTMENT_WINDOW_MINUTES*60000);
}
export function sortQueuePatients(patients: Patient[]) {
  return [...patients].sort((a,b)=>{
    if (a.priority!==b.priority) { if (a.priority==="urgent") return -1; if (b.priority==="urgent") return 1; }
    const d=getQueueEntryTime(a)-getQueueEntryTime(b); if(d!==0)return d;
    if(inferQueueType(a)!==inferQueueType(b)) return inferQueueType(a)==="appointment"?-1:1;
    return new Date(a.checkedInAt).getTime()-new Date(b.checkedInAt).getTime();
  });
}
export function getRecommendedNextPatient(patients: Patient[], now = new Date()) {
  const waiting=sortQueuePatients(patients.filter(p=>queueStatuses.includes(p.status)));
  const urgent=waiting.find(p=>p.priority==="urgent"); if(urgent)return urgent;
  return waiting.find(p=>inferQueueType(p)==="walk-in"||getQueueEntryTime(p)<=now.getTime());
}
export function calculatePatientsAhead(patient: Patient, allPatients: Patient[]){
  if(!queueStatuses.includes(patient.status))return 0;
  const q=sortQueuePatients(allPatients.filter(p=>queueStatuses.includes(p.status)));
  const i=q.findIndex(p=>p.id===patient.id||p.code===patient.code); return i<0?0:i;
}
export function calculateEstimatedWait(patient: Patient, allPatients: Patient[], averageTime: number){return calculatePatientsAhead(patient,allPatients)*averageTime}
export function recalculateQueue(patients: Patient[], averageConsultationTime: number){
  return patients.map(p=>({...p,queueType:inferQueueType(p),patientsAhead:calculatePatientsAhead(p,patients),estimatedWaitMinutes:calculateEstimatedWait(p,patients,averageConsultationTime)}));
}
export function getNowServing(allPatients: Patient[]){return allPatients.find(p=>p.status==="nurse-check")}
export function getNextPatients(allPatients: Patient[],limit=5){return sortQueuePatients(allPatients.filter(p=>queueStatuses.includes(p.status))).slice(0,limit)}
export function assignPatientRoom(patients: Patient[], code: string, room: string){return patients.map(p=>p.code===code?{...p,room}:p)}
export function formatAppointmentTime(patient: Patient){if(inferQueueType(patient)!=="appointment"||!patient.scheduledAt)return "—";return new Date(patient.scheduledAt).toLocaleTimeString("en-AE",{hour:"2-digit",minute:"2-digit"})}
export function getPatientMessage(patient: Patient){
  if(patient.status==="nurse-check")return "Your number has been called. Please proceed to the Nurse Station.";
  if(patient.status==="completed")return "Your queue visit is complete. Thank you.";
  if(inferQueueType(patient)==="appointment"&&patient.scheduledAt)return `Your appointment is registered for ${formatAppointmentTime(patient)}. Please watch the display for ${patient.code}.`;
  return `Please remain nearby and watch the display for ${patient.code}.`;
}
