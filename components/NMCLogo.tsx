import Image from "next/image";

export default function NMCLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center rounded-xl bg-white px-3 py-2 shadow-sm border border-slate-200 ${className}`}>
      <Image
        src="/images/nmc-logo.png"
        alt="Newcastle Medical Centre - NMC"
        width={260}
        height={80}
        priority
        className="h-10 sm:h-12 md:h-14 w-auto object-contain"
      />
    </div>
  );
}
