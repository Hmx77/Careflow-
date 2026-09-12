"use client";
import { useMemo,useState } from "react";
import { CalendarClock,ClipboardList,MessageCircle,Plus,Search,Trash2,UserRoundCheck,UsersRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/cards/MetricCard";
import { QueueTable } from "@/components/queue/QueueTable";
import { QueueTicket } from "@/components/queue/QueueTicket";
import { useQueueStore } from "@/lib/useQueueStore";
import type { PatientPriority,QueueType } from "@/lib/types";
function defaultAppointmentInput(){const d=new Date(Date.now()+30*60000);d.setSeconds(0,0);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
export default function ReceptionPage(){
 const {activePatients,completedPatients,addPatient,setStatus,callPatientToNurse,removePatient,clearQueue,updatePatient,lastMessage,mode}=useQueueStore();
 const [search,setSearch]=useState("");const [ticket,setTicket]=useState<string|null>(null);const [toast,setToast]=useState("");
 const [form,setForm]=useState({name:"",phone:"",queueType:"walk-in" as QueueType,scheduledAt:defaultAppointmentInput(),priority:"normal" as PatientPriority});
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return activePatients.filter(p=>!q||p.code.toLowerCase().includes(q)||p.name.toLowerCase().includes(q))},[activePatients,search]);
 const appointments=activePatients.filter(p=>p.queueType==="appointment").length;const walkIns=activePatients.filter(p=>p.queueType==="walk-in").length;
 return <AppShell title="Reception Dashboard" eyebrow="Appointments + walk-ins → one Nurse Station"><div className="space-y-6">
  <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
   <form onSubmit={e=>{e.preventDefault();if(!form.name.trim())return;const p=addPatient({name:form.name,phone:form.phone,queueType:form.queueType,scheduledAt:form.queueType==="appointment"?new Date(form.scheduledAt).toISOString():undefined,priority:form.priority});setTicket(p.code);setToast(`${p.code} created.`);setForm({...form,name:"",phone:""})}} className="glass-panel rounded-2xl p-5">
    <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clinic-mint text-clinic-teal"><Plus className="h-5 w-5"/></div><div><h2 className="text-xl font-bold text-navy-900">Add patient</h2><p className="text-sm text-clinic-muted">A-series = appointments · W-series = walk-ins</p></div></div>
    <div className="space-y-3">
     <Field label="Patient name"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4"/></Field>
     <Field label="Phone number"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4"/></Field>
     <Field label="Queue type"><div className="grid grid-cols-2 gap-2"><TypeButton active={form.queueType==="walk-in"} onClick={()=>setForm({...form,queueType:"walk-in"})} icon={<UsersRound className="h-4 w-4"/>} title="Walk-in" sub="W001 series"/><TypeButton active={form.queueType==="appointment"} onClick={()=>setForm({...form,queueType:"appointment"})} icon={<CalendarClock className="h-4 w-4"/>} title="Appointment" sub="A001 series"/></div></Field>
     {form.queueType==="appointment"&&<Field label="Scheduled appointment time"><input required type="datetime-local" value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4"/></Field>}
     <Field label="Priority"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as PatientPriority})} className="h-12 w-full rounded-2xl border border-clinic-line bg-white px-4"><option value="normal">Normal</option><option value="urgent">Urgent / medical priority</option><option value="follow-up">Follow-up</option></select></Field>
    </div>
    <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-clinic-teal font-bold text-white"><Plus className="h-5 w-5"/>Create & print queue number</button>
   </form>
   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><MetricCard title="Active patients" value={activePatients.length} icon={<UsersRound/>}/><MetricCard title="Appointments" value={appointments} icon={<CalendarClock/>}/><MetricCard title="Walk-ins" value={walkIns} icon={<ClipboardList/>}/><MetricCard title="At Nurse Station" value={activePatients.filter(p=>p.status==="nurse-check").length} icon={<UserRoundCheck/>} tone="green"/><MetricCard title="Completed today" value={completedPatients.length} icon={<UserRoundCheck/>} tone="green"/><MetricCard title="Backend mode" value={mode==="supabase"?"Supabase":"Demo"} icon={<MessageCircle/>}/></div>
  </div>
  <section className="glass-panel rounded-2xl p-5"><div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-clinic-teal">Reception queue</p><h2 className="mt-1 text-2xl font-bold text-navy-900">Appointments and walk-ins</h2>{lastMessage&&<p className="mt-2 text-sm font-semibold text-clinic-teal">{lastMessage}</p>}{toast&&<p className="mt-2 text-sm font-semibold text-clinic-teal">{toast}</p>}</div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative w-full xl:w-96"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-clinic-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search number or name" className="h-12 w-full rounded-2xl border border-clinic-line bg-white pl-10 pr-4"/></label><button type="button" onClick={()=>{if(window.confirm("Delete all queue numbers?"))clearQueue()}} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#FFD2D2] bg-[#FFF7F7] px-4 text-sm font-bold text-clinic-error"><Trash2 className="h-4 w-4"/>Delete all numbers</button></div></div>
   <QueueTable patients={filtered} onStatus={setStatus} onRemove={removePatient} onCall={p=>{callPatientToNurse(p.code);setToast(`Calling ${p.code} to Nurse Station.`)}} onNotify={p=>setToast(`Notification sent to ${p.code}.`)} onPrintTicket={setTicket} onUrgent={p=>updatePatient(p.code,{priority:"urgent"})}/>
  </section>
 </div>{ticket&&<div className="fixed inset-0 z-50 overflow-y-auto bg-[#12313F]/30 p-4"><div className="mx-auto max-w-md"><QueueTicket code={ticket} title="Print queue ticket" onClose={()=>setTicket(null)}/></div></div>}</AppShell>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-sm font-bold text-navy-800">{label}</span>{children}</label>}
function TypeButton({active,onClick,icon,title,sub}:{active:boolean;onClick:()=>void;icon:React.ReactNode;title:string;sub:string}){return <button type="button" onClick={onClick} className={`rounded-2xl border p-3 text-left ${active?"border-clinic-teal bg-clinic-mint":"border-clinic-line bg-white"}`}><span className="flex items-center gap-2 text-sm font-bold">{icon}{title}</span><span className="mt-1 block text-xs text-clinic-muted">{sub}</span></button>}
