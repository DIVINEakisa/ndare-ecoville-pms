export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 shadow-sm dark:bg-slate-800 ${className}`} />;
}
