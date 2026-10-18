import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ListTodo, AlertTriangle, Hourglass, Clock, Flame, CheckCircle2, CalendarX } from 'lucide-react'
import { buildPlan, formatMins, type Availability, type PlannerTask } from '@/lib/planner'
import { getFocusStats } from '@/lib/focus-stats'

export default async function StudyOverview() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, priority, due_date, estimated_mins')
    .eq('status', 'pending')

  const { data: availabilities } = await supabase.from('study_availability').select('*')

  const pending = (tasks ?? []) as PlannerTask[]
  const slots = (availabilities ?? []) as Availability[]
  const now = Date.now()

  const overdue = pending.filter((t) => new Date(t.due_date).getTime() < now).length
  const prepMins = pending.reduce((s, t) => s + (t.estimated_mins || 30), 0)

  const plan = buildPlan(slots, pending, now)
  const focus = await getFocusStats(supabase)
  const unscheduledCount = plan.unscheduled.length

  let status: { text: string; tone: 'ok' | 'warn' | 'info'; href?: string }
  if (slots.length === 0) {
    status = { text: 'Set your Free Time so your tasks can be planned.', tone: 'info', href: '/availability' }
  } else if (pending.length === 0) {
    status = { text: 'No pending tasks. You are free.', tone: 'ok' }
  } else if (unscheduledCount > 0) {
    status = {
      text: `${unscheduledCount} ${unscheduledCount > 1 ? 'tasks don\'t' : 'task doesn\'t'} fit. Add more free time.`,
      tone: 'warn',
      href: '/planner',
    }
  } else {
    status = { text: 'All tasks have time in the planner.', tone: 'ok', href: '/planner' }
  }

  const toneClass = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }[status.tone]

  const Row = ({
    icon,
    label,
    value,
    danger = false,
  }: {
    icon: React.ReactNode
    label: string
    value: string | number
    danger?: boolean
  }) => (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-slate-500 font-medium">
        {icon} {label}
      </span>
      <span className={`font-bold ${danger ? 'text-rose-600' : 'text-slate-900'}`}>{value}</span>
    </div>
  )

  const statusBox = (
    <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs font-bold flex items-start gap-2 ${toneClass}`}>
      {status.tone === 'ok' ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : status.tone === 'warn' ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <CalendarX className="w-4 h-4 shrink-0" />
      )}
      <span>{status.text}</span>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="mb-5 text-lg font-bold">Study overview</h3>

      <div className="space-y-3">
        <Row icon={<ListTodo className="w-4 h-4" />} label="Pending" value={pending.length} />
        <Row icon={<AlertTriangle className="w-4 h-4" />} label="Overdue" value={overdue} danger={overdue > 0} />
        <Row icon={<Hourglass className="w-4 h-4" />} label="Prep time needed" value={formatMins(prepMins)} />
        <Row icon={<Clock className="w-4 h-4" />} label="Free time (7 days)" value={formatMins(plan.totalCapacity)} />
        <Row
          icon={<CalendarX className="w-4 h-4" />}
          label="Unscheduled"
          value={unscheduledCount}
          danger={unscheduledCount > 0}
        />
      </div>

      <div className="border-t border-slate-100 mt-4 pt-4 space-y-3">
        <Row icon={<Clock className="w-4 h-4" />} label="Focused today" value={focus.available ? formatMins(focus.todayMins) : '—'} />
        <Row icon={<Flame className="w-4 h-4 text-orange-500" />} label="Day streak" value={focus.available ? focus.streak : '—'} />
      </div>

      {status.href ? <Link href={status.href}>{statusBox}</Link> : statusBox}
    </div>
  )
}