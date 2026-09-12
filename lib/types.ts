export type PatientPriority = "normal" | "urgent" | "follow-up";
export type QueueType = "appointment" | "walk-in";

export type PatientStatus =
  | "checked-in"
  | "waiting"
  | "nurse-check"
  | "consultation"
  | "lab-payment"
  | "completed"
  | "delayed";

export type Patient = {
  id: string;
  code: string;
  name: string;
  phone?: string;
  queueType?: QueueType;
  scheduledAt?: string;
  appointmentType: string;
  department?: string;
  doctor?: string;
  priority: PatientPriority;
  status: PatientStatus;
  estimatedWaitMinutes: number;
  patientsAhead: number;
  room?: string;
  checkedInAt: string;
  notes?: string;
};

export type Room = { id: string; name: string; department: string; status: "available" | "occupied" | "cleaning" };
export type Doctor = { id: string; name: string; department: string; room: string; status: "available" | "consulting" | "break" };

export type QueueSettings = {
  privacyMode: boolean;
  smsSimulation: boolean;
  whatsappSimulation: boolean;
  emailSimulation: boolean;
  averageConsultationTime: number;
  defaultWaitCalculation: "standard" | "priority-weighted";
  clinicName: string;
  accentColor: string;
  displayMessage: string;
};

export type NewPatientInput = {
  name: string;
  phone?: string;
  queueType?: QueueType;
  scheduledAt?: string;
  appointmentType?: string;
  department?: string;
  doctor?: string;
  priority: PatientPriority;
  notes?: string;
};

export type PatientServiceMode = "supabase" | "demo";
