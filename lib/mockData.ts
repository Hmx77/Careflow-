import type { Doctor, Patient, QueueSettings, Room } from "./types";

export const NEWCASTLE = {
  clinicName: "Newcastle Medical Centre",
  location: "Shakhbout City, Abu Dhabi",
  hotline: "02 55 11 138",
  email: "info@newcastle.ae",
  hours: "8:00 AM - 12:00 Midnight"
};

export const departments = [
  "General Medicine",
  "Family Medicine",
  "Pediatrics",
  "Pediatric Gastroenterology",
  "Dentistry",
  "Orthodontics",
  "Prosthodontics",
  "Pedodontics",
  "Psychiatry",
  "Gynecology & Obstetrics",
  "Lab Test",
  "Follow-up"
];

export const appointmentTypes = [
  "Walk-in consultation",
  "Scheduled appointment",
  "Follow-up visit",
  "Lab test",
  "Dental consultation",
  "Pediatric visit"
];

export const doctors: Doctor[] = [
  { id: "dr-1", name: "Dr. Demo General", department: "General Medicine", room: "Room 1", status: "available" },
  { id: "dr-2", name: "Dr. Demo Family", department: "Family Medicine", room: "Room 2", status: "consulting" },
  { id: "dr-3", name: "Dr. Demo Pediatrics", department: "Pediatrics", room: "Pediatrics Room", status: "available" },
  { id: "dr-4", name: "Dr. Demo Dental", department: "Dentistry", room: "Dental Room", status: "consulting" },
  { id: "dr-5", name: "Dr. Demo OB", department: "Gynecology & Obstetrics", room: "Room 3", status: "available" },
  { id: "dr-6", name: "Lab Team", department: "Lab Test", room: "Lab", status: "available" }
];

export const rooms: Room[] = [
  { id: "room-1", name: "Room 1", department: "General Medicine", status: "available" },
  { id: "room-2", name: "Room 2", department: "Family Medicine", status: "occupied" },
  { id: "room-3", name: "Room 3", department: "Gynecology & Obstetrics", status: "available" },
  { id: "dental", name: "Dental Room", department: "Dentistry", status: "occupied" },
  { id: "peds", name: "Pediatrics Room", department: "Pediatrics", status: "available" },
  { id: "lab", name: "Lab", department: "Lab Test", status: "available" },
  { id: "payment", name: "Payment Desk", department: "Administration", status: "available" }
];

export const defaultSettings: QueueSettings = {
  privacyMode: true,
  smsSimulation: true,
  whatsappSimulation: true,
  emailSimulation: false,
  averageConsultationTime: 7,
  defaultWaitCalculation: "priority-weighted",
  clinicName: NEWCASTLE.clinicName,
  accentColor: "#18A9D6",
  displayMessage: "Please remain nearby. You will be called by your private Newcastle code."
};

const now = Date.now();

export const seedPatients: Patient[] = [
  {
    id: "patient-201",
    code: "A001",
    name: "Newcastle Visit 201",
    phone: "+971 50 000 0001",
    queueType: "appointment",
    scheduledAt: new Date(now + 20 * 60000).toISOString(),
    appointmentType: "Scheduled appointment",
    department: "General Medicine",
    doctor: "Dr. Demo General",
    priority: "normal",
    status: "waiting",
    estimatedWaitMinutes: 7,
    patientsAhead: 1,
    room: "Room 1",
    checkedInAt: new Date(now - 34 * 60000).toISOString(),
    notes: "Internal demo note for staff only."
  },
  {
    id: "patient-202",
    code: "W001",
    name: "Newcastle Visit 202",
    phone: "+971 50 000 0002",
    queueType: "walk-in",
    appointmentType: "Walk-in",
    department: "Pediatrics",
    doctor: "Dr. Demo Pediatrics",
    priority: "normal",
    status: "nurse-check",
    estimatedWaitMinutes: 3,
    patientsAhead: 0,
    room: "Pediatrics Room",
    checkedInAt: new Date(now - 28 * 60000).toISOString()
  },
  {
    id: "patient-203",
    code: "A002",
    name: "Newcastle Visit 203",
    queueType: "appointment",
    scheduledAt: new Date(now - 15 * 60000).toISOString(),
    appointmentType: "Scheduled appointment",
    department: "Dentistry",
    doctor: "Dr. Demo Dental",
    priority: "follow-up",
    status: "consultation",
    estimatedWaitMinutes: 0,
    patientsAhead: 0,
    room: "Dental Room",
    checkedInAt: new Date(now - 22 * 60000).toISOString()
  },
  {
    id: "patient-204",
    code: "W002",
    name: "Newcastle Visit 204",
    phone: "+971 50 000 0004",
    queueType: "walk-in",
    appointmentType: "Walk-in",
    department: "Family Medicine",
    doctor: "Dr. Demo Family",
    priority: "urgent",
    status: "waiting",
    estimatedWaitMinutes: 0,
    patientsAhead: 0,
    room: "Room 2",
    checkedInAt: new Date(now - 18 * 60000).toISOString()
  },
  {
    id: "patient-205",
    code: "W003",
    name: "Newcastle Visit 205",
    queueType: "walk-in",
    appointmentType: "Walk-in",
    department: "Lab Test",
    doctor: "Lab Team",
    priority: "normal",
    status: "lab-payment",
    estimatedWaitMinutes: 4,
    patientsAhead: 0,
    room: "Lab",
    checkedInAt: new Date(now - 44 * 60000).toISOString()
  },
  {
    id: "patient-206",
    code: "A003",
    name: "Newcastle Visit 206",
    queueType: "appointment",
    scheduledAt: new Date(now - 80 * 60000).toISOString(),
    appointmentType: "Scheduled appointment",
    department: "Gynecology & Obstetrics",
    doctor: "Dr. Demo OB",
    priority: "follow-up",
    status: "completed",
    estimatedWaitMinutes: 0,
    patientsAhead: 0,
    room: "Room 3",
    checkedInAt: new Date(now - 90 * 60000).toISOString()
  },
  {
    id: "patient-207",
    code: "A004",
    name: "Newcastle Visit 207",
    appointmentType: "Scheduled appointment",
    department: "Psychiatry",
    doctor: "Dr. Demo General",
    priority: "normal",
    status: "delayed",
    estimatedWaitMinutes: 18,
    patientsAhead: 2,
    room: "Room 1",
    checkedInAt: new Date(now - 12 * 60000).toISOString()
  }
];
