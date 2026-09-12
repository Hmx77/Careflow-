import { Check } from "lucide-react";
import { progressSteps } from "@/lib/queueUtils";
import type { PatientStatus } from "@/lib/types";

export function PatientProgress({ status }: { status: PatientStatus }) {
  const activeIndex = Math.max(0, progressSteps.findIndex((step) => step.key === status));

  return (
    <div className="rounded-3xl border border-clinic-line bg-white p-4">
      <p className="mb-4 font-bold text-navy-900">Visit progress</p>
      <div className="space-y-3">
        {progressSteps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${index <= activeIndex ? "bg-clinic-teal text-white" : "bg-clinic-grey text-clinic-muted"}`}>
              {index < activeIndex ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="h-2 flex-1 rounded-full bg-clinic-grey">
              <div className={`h-2 rounded-full ${index <= activeIndex ? "bg-clinic-teal" : "bg-transparent"}`} style={{ width: index <= activeIndex ? "100%" : "0%" }} />
            </div>
            <p className="w-24 text-right text-xs font-bold text-clinic-muted">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
