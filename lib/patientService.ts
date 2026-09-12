import { defaultSettings, seedPatients } from "./mockData";
import { generatePatientCode, recalculateQueue } from "./queueUtils";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { NewPatientInput, Patient, QueueSettings } from "./types";

export const PATIENTS_KEY = "careflow-newcastle-patients-v4";
export const SETTINGS_KEY = "careflow-newcastle-settings-v4";
export const PATIENTS_EVENT = "careflow-patients-updated";
export const SETTINGS_EVENT = "careflow-settings-updated";
function makeId(){return `${Date.now()}-${Math.random().toString(36).slice(2)}`}
function readLocal<T>(key:string,fallback:T){if(typeof window==="undefined")return fallback;try{const s=window.localStorage.getItem(key);return s?JSON.parse(s) as T:fallback}catch{return fallback}}
function writeLocal<T>(key:string,value:T){if(typeof window!=="undefined")window.localStorage.setItem(key,JSON.stringify(value))}
export function getPatientServiceMode(){return isSupabaseConfigured?"supabase":"demo"}
export function getLocalPatients(){return readLocal(PATIENTS_KEY,seedPatients)}
export function getLocalSettings(){return readLocal(SETTINGS_KEY,defaultSettings)}
export function saveLocalPatients(patients:Patient[]){writeLocal(PATIENTS_KEY,patients);window.dispatchEvent(new CustomEvent(PATIENTS_EVENT,{detail:patients}))}
export function saveLocalSettings(settings:QueueSettings){writeLocal(SETTINGS_KEY,settings);window.dispatchEvent(new CustomEvent(SETTINGS_EVENT,{detail:settings}))}
export function createMockPatient(input:NewPatientInput,currentPatients:Patient[]){
  const queueType=input.queueType ?? (input.appointmentType?.toLowerCase().includes("scheduled")?"appointment":"walk-in");
  return {id:makeId(),code:generatePatientCode(currentPatients,queueType),name:input.name.trim(),phone:input.phone?.trim()||undefined,queueType,scheduledAt:queueType==="appointment"?input.scheduledAt:undefined,appointmentType:queueType==="appointment"?"Scheduled appointment":"Walk-in",department:input.department,doctor:input.doctor,priority:input.priority,status:"waiting",estimatedWaitMinutes:0,patientsAhead:0,checkedInAt:new Date().toISOString(),notes:input.notes?.trim()||undefined} satisfies Patient;
}
export function patientToSupabaseRow(p:Patient){return {id:p.id,code:p.code,name:p.name,phone:p.phone,queue_type:p.queueType,scheduled_at:p.scheduledAt,appointment_type:p.appointmentType,department:p.department,doctor:p.doctor,priority:p.priority,status:p.status,estimated_wait_minutes:p.estimatedWaitMinutes,patients_ahead:p.patientsAhead,room:p.room,checked_in_at:p.checkedInAt,notes:p.notes}}
export function supabaseRowToPatient(row:Record<string,unknown>):Patient{const appointmentType=String(row.appointment_type??"Walk-in");const queueType=(row.queue_type==="appointment"||row.queue_type==="walk-in")?row.queue_type:(appointmentType.toLowerCase().includes("scheduled")?"appointment":"walk-in");return {id:String(row.id),code:String(row.code),name:String(row.name),phone:row.phone?String(row.phone):undefined,queueType,scheduledAt:row.scheduled_at?String(row.scheduled_at):undefined,appointmentType,department:row.department?String(row.department):undefined,doctor:row.doctor?String(row.doctor):undefined,priority:row.priority as Patient["priority"],status:row.status as Patient["status"],estimatedWaitMinutes:Number(row.estimated_wait_minutes??0),patientsAhead:Number(row.patients_ahead??0),room:row.room?String(row.room):undefined,checkedInAt:String(row.checked_in_at),notes:row.notes?String(row.notes):undefined}}
export async function fetchPatients(settings:QueueSettings){if(!supabase)return recalculateQueue(getLocalPatients(),settings.averageConsultationTime);const {data,error}=await supabase.from("patients").select("*").order("checked_in_at",{ascending:true});if(error||!data)return recalculateQueue(getLocalPatients(),settings.averageConsultationTime);return recalculateQueue(data.map(supabaseRowToPatient),settings.averageConsultationTime)}
export async function persistPatient(p:Patient){if(supabase)await supabase.from("patients").upsert(patientToSupabaseRow(p))}
export async function deletePatientRecord(id:string){if(supabase)await supabase.from("patients").delete().eq("id",id)}
export async function deleteAllPatientRecords(){if(supabase)await supabase.from("patients").delete().neq("id","")}
