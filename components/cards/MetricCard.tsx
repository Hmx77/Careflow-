"use client";

import { motion } from "framer-motion";

export function MetricCard({
  title,
  value,
  icon,
  tone = "blue"
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const toneClass = {
    blue: "bg-clinic-blue text-navy-700",
    green: "bg-green-50 text-clinic-success",
    amber: "bg-[#FFF7E6] text-clinic-warning",
    red: "bg-[#FFF1F1] text-clinic-error"
  }[tone];

  return (
    <motion.div whileHover={{ y: -3 }} className="glass-panel rounded-2xl p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
      <p className="text-sm font-semibold text-clinic-muted">{title}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-navy-900">{value}</p>
    </motion.div>
  );
}
