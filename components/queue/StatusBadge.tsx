import { priorityLabels, statusLabels } from "@/lib/queueUtils";
import type { PatientPriority, PatientStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: PatientStatus }) {
  const styles: Record<PatientStatus, string> = {
    "checked-in": "bg-clinic-blue text-navy-700",
    waiting: "bg-clinic-mint text-navy-700",
    "nurse-check": "bg-clinic-mint text-clinic-teal",
    consultation: "bg-green-50 text-clinic-success",
    "lab-payment": "bg-clinic-blue text-navy-700",
    completed: "bg-green-50 text-clinic-success",
    delayed: "bg-[#FFF7E6] text-clinic-warning"
  };

  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${styles[status]}`}>{statusLabels[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: PatientPriority }) {
  const styles: Record<PatientPriority, string> = {
    normal: "bg-clinic-grey text-clinic-muted",
    urgent: "bg-[#FFF1F1] text-clinic-error",
    "follow-up": "bg-clinic-mint text-clinic-teal"
  };

  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${styles[priority]}`}>{priorityLabels[priority]}</span>;
}
