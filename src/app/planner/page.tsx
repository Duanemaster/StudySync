import { createClient } from '@/utils/supabase/server'
import { connection } from 'next/server'
import Link from 'next/link'
import {
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  Clock,
  Play,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildPlan,
  describeDate,
  formatDue,
  formatMins,
  type Availability,
  type Occurrence,
  type PlannerTask,
} from '@/lib/planner'

export default async function PlannerPage() {
  await connection()
  const supabase = await createClient()

  const { data: availabilities } = await supabase
    .from('study_availability')
    .select('*')
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, subjects(name, color)')
    .eq('status', 'pending')
    .order('due_date', { ascending: true })

  const safeAvailabilities = (availabilities ?? []) as Availability[]
  const safeTasks = (tasks ?? []) as unknown as PlannerTask[]

  const plan = buildPlan(safeAvailabilities, safeTasks)

  // Group by day
  const days = new Map<string, Occurrence[]>()
  for (const occ of plan.occurrences) {
    const list = days.get(occ.dateKey) ?? []
    list.push(occ)
    days.set(occ.dateKey, list)
  }

  const hasAvailability = safeAvailabilities.length > 0

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-10 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-4 mb-2">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-indigo-600" />
              Smart Planner
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">
              Auto-fits your tasks into your free time for the next 7 days. Sorted by due date, then priority.
            </p>
          </div>

          <Link href="/availability" className="w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
            <Button
              variant="outline"
              className="w-full sm:w-auto font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 h-11 px-6"
            >
              Edit Free Time
            </Button>
          </Link>
        </header>

        {/* SUMMARY */}
        {hasAvailability && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Free time</p>
              <p className="text-xl md:text-2xl font-extrabold mt-1">{formatMins(plan.totalCapacity)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Planned</p>
              <p className="text-xl md:text-2xl font-extrabold mt-1 text-indigo-600">
                {formatMins(plan.totalPlanned)}
              </p>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                plan.unscheduled.length > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Unscheduled</p>
              <p
                className={`text-xl md:text-2xl font-extrabold mt-1 ${
                  plan.unscheduled.length > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {plan.unscheduled.length}
              </p>
            </div>
          </div>
        )}

        {/* DAYS */}
        <div className="space-y-8">
          {Array.from(days.entries()).map(([dateKey, occs]) => {
            const { label, tag } = describeDate(dateKey, plan.todayKey)
            return (
              <section key={dateKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-800">{label}</h2>
                  {tag && (
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  )}
                </div>

                {occs.map((slot) => (
                  <div
                    key={slot.key}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="bg-slate-50/50 border-b border-slate-100 p-4 md:p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl hidden sm:block">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <p className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          {slot.start} - {slot.end}
                          <span className="text-slate-400 font-medium">• {formatMins(slot.capacity)} study time</span>
                        </p>
                      </div>
                      <span className="shrink-0 ml-2 text-xs font-bold bg-slate-200 text-slate-600 px-2 md:px-3 py-1.5 rounded-lg whitespace-nowrap">
                        {formatMins(slot.remaining)} left
                      </span>
                    </div>

                    <div className="p-4 md:p-5 space-y-3">
                      {slot.blocks.length > 0 ? (
                        slot.blocks.map((b) => (
                          <div
                            key={`${b.task.id}-${b.part}`}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-100 bg-white rounded-xl p-4 shadow-sm hover:border-indigo-100 transition-colors"
                          >
                            <div className="flex items-start sm:items-center gap-3 md:gap-4">
                              <div
                                className="w-1.5 h-10 rounded-full shrink-0 mt-1 sm:mt-0"
                                style={{ backgroundColor: b.task.subjects?.color || '#cbd5e1' }}
                              />
                              <div>
                                <h4 className="font-bold text-sm md:text-base text-slate-900">
                                  {b.task.title}
                                  {b.parts > 1 && (
                                    <span className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                      Part {b.part}/{b.parts}
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs font-medium text-slate-500 mt-1">
                                  {b.task.subjects?.name || 'No Subject'} • Priority {b.task.priority ?? 2} • Due{' '}
                                  {formatDue(b.task.due_date)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4 sm:ml-0 sm:shrink-0">
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md">
                                <Clock className="w-3.5 h-3.5" /> {b.mins} min
                              </span>
                              <Link
                                href={`/study-room?task=${b.task.id}&mins=${b.mins}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" /> Start
                              </Link>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-sm font-bold text-slate-400">Free Time</p>
                          <p className="text-xs text-slate-400 mt-1">No tasks in this slot yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
        </div>

        {/* UNSCHEDULED */}
        {plan.unscheduled.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Not enough free time
            </h2>
            <div className="space-y-2">
              {plan.unscheduled.map(({ task, missingMins, plannedMins, overdue }) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-amber-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm md:text-base">{task.title}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {task.subjects?.name || 'No Subject'} • Due {formatDue(task.due_date)}
                      {plannedMins > 0 && ` • ${formatMins(plannedMins)} already planned`}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-amber-700 sm:text-right">
                    Short by {formatMins(missingMins)}
                    <p className="font-medium text-slate-500">
                      {overdue
                        ? 'Already overdue. Do it now or move the due date.'
                        : 'Add more free time before the due date.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/availability" className="inline-block text-sm font-bold text-amber-800 underline">
              Add more free time
            </Link>
          </section>
        )}

        {hasAvailability && safeTasks.length === 0 && (
          <div className="text-center p-8 bg-white rounded-3xl border border-dashed border-slate-300">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No pending tasks</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Add a task and it will be planned here.</p>
            <Link href="/tasks">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 h-11">
                Add Task
              </Button>
            </Link>
          </div>
        )}

        {hasAvailability && plan.occurrences.length === 0 && (
          <div className="text-center p-8 bg-white rounded-3xl border border-dashed border-slate-300">
            <h3 className="text-lg font-bold text-slate-700">No usable slots</h3>
            <p className="text-slate-500 text-sm mt-1">
              Slots shorter than 15 minutes or already past are skipped.
            </p>
          </div>
        )}

        {!hasAvailability && (
          <div className="text-center p-8 md:p-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Free Time set yet</h3>
            <p className="text-slate-500 font-medium text-sm md:text-base mt-2 mb-6">
              Add when you are available so the planner can schedule your tasks.
            </p>
            <Link href="/availability">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 h-12">
                Set Free Time
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}