import { BrainCircuit } from 'lucide-react'

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-slate-50"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-indigo-600 motion-reduce:animate-none" />
        <BrainCircuit className="h-6 w-6 text-indigo-500" />
      </div>

      <p className="animate-pulse text-sm font-semibold tracking-wide text-slate-500 motion-reduce:animate-none">
        Loading...
      </p>
    </div>
  )
}