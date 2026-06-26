// Generic container card for the info grid tiles
export default function InfoCard({ title, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-6 min-w-0 ${className}`}
    >
      <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
        {title}
      </p>
      {children}
    </div>
  );
}
