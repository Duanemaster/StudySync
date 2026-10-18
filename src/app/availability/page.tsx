import { createClient } from '@/utils/supabase/server'
import { connection } from 'next/server'
import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'
import AvailabilityManager from './AvailabilityManager'

export default async function AvailabilityPage() {
  await connection()
  const supabase = await createClient()

  const { data: availabilities } = await supabase
    .from('study_availability')
    .select('*')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-5 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Clock className="w-8 h-8 text-indigo-600" />
              Free Time
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              When can you study? Smart Planner uses these times to schedule your tasks.
            </p>
          </div>
        </header>

        <AvailabilityManager initialSlots={availabilities ?? []} />
      </div>
    </div>
  )
}