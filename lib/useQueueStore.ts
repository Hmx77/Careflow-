"use client";
import { useEffect,useMemo,useState } from "react";
import { defaultSettings,doctors,rooms,seedPatients } from "./mockData";
import { getActivePatients,recalculateQueue } from "./queueUtils";
import { createMockPatient,deleteAllPatientRecords,deletePatientRecord,fetchPatients,getLocalSettings,getPatientServiceMode,PATIENTS_EVENT,persistPatient,saveLocalPatients,saveLocalSettings,SETTINGS_EVENT } from "./patientService";
import type { NewPatientInput,Patient,PatientStatus,QueueSettings } from "./types";
export function useQueueStore(){
 const [hydrated,setHydrated]=useState(false);const [patients,setPatients]=useState<Patient[]>(seedPatients);const [settings,setSettings]=useState<QueueSettings>(defaultSettings);const [lastMessage,setLastMessage]=useState("");const mode=getPatientServiceMode();
 useEffect(()=>{let c=false;(async()=>{const s=getLocalSettings();const p=await fetchPatients(s);if(c)return;setSettings(s);setPatients(p);setHydrated(true)})();return()=>{c=true}},[]);
 useEffect(()=>{function hp(e:Event){const d=(e as CustomEvent<Patient[]>).detail;if(d)setPatients(d)}function hs(e:Event){const d=(e as CustomEvent<QueueSettings>).detail;if(d)setSettings(d)}window.addEventListener(PATIENTS_EVENT,hp);window.addEventListener(SETTINGS_EVENT,hs);return()=>{window.removeEventListener(PATIENTS_EVENT,hp);window.removeEventListener(SETTINGS_EVENT,hs)}},[]);
 useEffect(()=>{if(hydrated)saveLocalPatients(patients)},[hydrated,patients]);useEffect(()=>{if(hydrated)saveLocalSettings(settings)},[hydrated,settings]);
 const activePatients=useMemo(()=>getActivePatients(patients),[patients]);const completedPatients=useMemo(()=>patients.filter(p=>p.status==="completed"),[patients]);
 function commit(next:Patient[],s=settings){const r=recalculateQueue(next,s.averageConsultationTime);setPatients(r);if(typeof window!=="undefined")saveLocalPatients(r);return r}
 function addPatient(input:NewPatientInput){const p=createMockPatient(input,patients);commit([...patients,p]);persistPatient(p);setLastMessage(`${p.code} checked in.`);return p}
 function updatePatient(code:string,updates:Partial<Patient>){const r=commit(patients.map(p=>p.code===code?{...p,...updates}:p));const changed=r.find(p=>p.code===code);if(changed)persistPatient(changed);setLastMessage(`${code} updated.`)}
 function setStatus(code:string,status:PatientStatus){updatePatient(code,{status})}
 function callPatientToNurse(code:string){const r=commit(patients.map(p=>p.code===code?{...p,status:"nurse-check" as PatientStatus}:p.status==="nurse-check"?{...p,status:"waiting" as PatientStatus}:p));r.forEach(p=>{if(p.code===code||p.status==="waiting")persistPatient(p)});setLastMessage(`${code} called to the Nurse Station.`)}
 function removePatient(code:string){const p=patients.find(x=>x.code===code);commit(patients.filter(x=>x.code!==code));if(p)deletePatientRecord(p.id);setLastMessage(`${code} removed.`)}
 function clearQueue(){commit([]);deleteAllPatientRecords();setLastMessage("All queue numbers cleared. Counters restart at A001 and W001.")}
 function resetDemoQueue(){commit(seedPatients,settings);setLastMessage("Demo queue reset.")}
 function updateSettings(n:QueueSettings){setSettings(n);saveLocalSettings(n);commit(patients,n)}
 return {hydrated,patients,activePatients,completedPatients,settings,mode,doctors,rooms,lastMessage,addPatient,updatePatient,setStatus,callPatientToNurse,removePatient,clearQueue,resetDemoQueue,updateSettings};
}
