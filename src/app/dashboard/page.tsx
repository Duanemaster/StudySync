import { Suspense, cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import StudyOverview from '@/components/StudyOverview'
import {
  LayoutDashboard,
  BookOpen,
  ListTodo,
  Clock,
  BrainCircuit,
  LogOut,
  CheckCircle2,
  MonitorPlay,
} from 'lucide-react'

const TZ = 'Asia/Manila'

type Task = {
  id: string
  title: string
  type: string | null
  due_date: string
  estimated_mins: number | null
  subjects: { name: string; color: string | null } | null
}

/* ---------- data (deduped per request) ---------- */

const getDashboardData = cache(async () => {
  await connection() // request-time rendering

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, subjects(name, color)')
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(50)

  return { profile, tasks: (tasks ?? []) as unknown as Task[] }
})

/* ---------- helpers ---------- */

function dayKey(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD
}

function daysUntil(due: string) {
  const [y1, m1, d1] = dayKey(new Date()).split('-').map(Number)
  const [y2, m2, d2] = dayKey(new Date(due)).split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

function relativeDue(diff: number) {
  if (diff < 0) return `${-diff} ${-diff === 1 ? 'day' : 'days'} overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due in ${diff} days`
}

function shortDate(due: string) {
  return new Date(due).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: TZ,
  })
}

function greeting() {
  const hour = Number(
    new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })
  )
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatMins(total: number) {
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const TONES = {
  overdue: { bg: 'bg-rose-600', soft: 'text-rose-100', btn: 'text-rose-700 hover:bg-rose-50' },
  soon: { bg: 'bg-orange-500', soft: 'text-orange-100', btn: 'text-orange-700 hover:bg-orange-50' },
  calm: { bg: 'bg-indigo-600', soft: 'text-indigo-100', btn: 'text-indigo-700 hover:bg-indigo-50' },
}

function toneFor(diff: number) {
  if (diff < 0) return TONES.overdue
  if (diff <= 2) return TONES.soon
  return TONES.calm
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/tasks', label: 'Tasks & Exams', icon: ListTodo },
  { href: '/availability', label: 'Free Time', icon: Clock },
  { href: '/study-room', label: 'Focus Mode', icon: MonitorPlay },
]

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, active: true },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/availability', label: 'Free Time', icon: Clock },
  { href: '/planner', label: 'Planner', icon: BrainCircuit },
  { href: '/study-room', label: 'Focus', icon: MonitorPlay },
]

/* ---------- page (static shell) ---------- */

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-20 hidden h-full w-64 flex-col justify-between border-r border-slate-200 bg-white md:flex">
        <div className="p-6">
          <div className="mb-10 text-2xl font-extrabold tracking-tight">StudySync</div>

          <nav className="space-y-1">
            {NAV.map(({ href, label, icon: Icon, active }) => (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white'
                    : 'flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900'
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}

            <div className="mt-4 border-t border-slate-100 pt-4">
              <Link
                href="/planner"
                className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <BrainCircuit className="h-5 w-5" />
                Smart Planner
              </Link>
            </div>
          </nav>
        </div>

        <div className="p-6">
          <Suspense fallback={<div className="h-[74px] animate-pulse rounded-2xl bg-slate-100" />}>
            <UserChip />
          </Suspense>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white p-3 pb-safe md:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center ${
              active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            <Icon className="mb-1 h-6 w-6" />
            <span className="text-[10px] font-semibold">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Main */}
      <main className="mx-auto mb-20 w-full max-w-6xl flex-1 p-5 md:ml-64 md:mb-0 md:p-10">
        <Suspense fallback={<MainSkeleton />}>
          <MainContent />
        </Suspense>
      </main>
    </div>
  )
}

/* ---------- dynamic parts ---------- */

async function UserChip() {
  const { profile } = await getDashboardData()
  const name = profile?.display_name || 'Student'

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
          {name.charAt(0)}
        </div>
        <div className="truncate text-sm font-bold text-slate-700">{name}</div>
      </div>
      <form action={logout}>
        <button
          type="submit"
          aria-label="Log out"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

async function MainContent() {
  const { profile, tasks } = await getDashboardData()

  const firstName = (profile?.display_name || 'Student').split(' ')[0]
  const topTask = tasks[0]
  const topDiff = topTask ? daysUntil(topTask.due_date) : 0
  const tone = toneFor(topDiff)

  const overdueCount = tasks.filter((t) => daysUntil(t.due_date) < 0).length
  const upcoming = tasks.slice(0, 5)

  //   // Study Room: attach the task and planned minutes
  const startHref = topTask
    ? `/study-room?task=${topTask.id}${
        topTask.estimated_mins ? `&mins=${topTask.estimated_mins}` : ''
      }`
    : '/study-room'

  return (
    <>
      <header className="mb-8 flex items-center justify-between md:mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            {tasks.length === 0
              ? 'Nothing pending. Enjoy the break.'
              : overdueCount > 0
              ? `${overdueCount} overdue, ${tasks.length - overdueCount} still ahead.`
              : `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} coming up.`}
          </p>
        </div>
        <form action={logout} className="md:hidden">
          <button
            type="submit"
            aria-label="Log out"
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Hero: the one bold element. Color encodes urgency. */}
          {topTask ? (
            <section className={`rounded-3xl p-8 text-white md:p-10 ${tone.bg}`}>
              <p className={`text-sm font-medium ${tone.soft}`}>
                Next up{topTask.subjects?.name ? ` in ${topTask.subjects.name}` : ''}
              </p>
              <p className="mt-3 text-5xl font-black leading-none tracking-tight md:text-6xl">
                {relativeDue(topDiff)}
              </p>
              <h2 className="mt-5 text-2xl font-bold md:text-3xl">{topTask.title}</h2>
              <p className={`mt-2 text-sm md:text-base ${tone.soft}`}>
                <span className="capitalize">{topTask.type ?? 'Task'}</span> on{' '}
                {shortDate(topTask.due_date)}
                {topTask.estimated_mins ? `, about ${formatMins(topTask.estimated_mins)} of prep` : ''}
              </p>
              <Link
                href={startHref}
                className={`mt-6 inline-flex items-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold transition-colors ${tone.btn}`}
              >
                Start reviewing ↗
              </Link>
            </section>
          ) : (
            <section className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500" />
              <h2 className="text-2xl font-bold">All caught up</h2>
              <p className="mt-1 text-slate-500">No pending tasks or exams. Add one when something comes up.</p>
              <Link href="/tasks" className="mt-6">
                <Button className="rounded-xl px-6 py-5 font-bold">Add a task</Button>
              </Link>
            </section>
          )}

          {/* Quick actions */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-500">Quick actions</h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {[
                { href: '/subjects', label: 'New subject', icon: BookOpen, c: 'text-indigo-600 bg-indigo-50' },
                { href: '/tasks', label: 'New task', icon: ListTodo, c: 'text-emerald-600 bg-emerald-50' },
                { href: '/availability', label: 'Set free time', icon: Clock, c: 'text-purple-600 bg-purple-50' },
              ].map(({ href, label, icon: Icon, c }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 md:p-5"
                >
                  <span className={`w-fit rounded-xl p-2.5 ${c}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold md:text-base">{label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Deadlines */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-500">Upcoming deadlines</h3>
              {tasks.length > upcoming.length && (
                <Link href="/tasks" className="text-sm font-semibold text-indigo-600 hover:underline">
                  See all {tasks.length}
                </Link>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {upcoming.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {upcoming.map((task) => {
                    const diff = daysUntil(task.due_date)
                    const badge =
                      diff < 0
                        ? 'bg-rose-50 text-rose-600'
                        : diff <= 2
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-slate-100 text-slate-600'

                    return (
                      <li key={task.id}>
                        <Link
                          href="/tasks"
                          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50 md:p-5"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <span
                              className="h-10 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: task.subjects?.color || '#cbd5e1' }}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <h4 className="truncate font-bold">{task.title}</h4>
                              <p className="mt-0.5 truncate text-sm capitalize text-slate-500">
                                {task.subjects?.name ?? 'No subject'}, {task.type ?? 'task'}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${badge}`}>
                              {relativeDue(diff)}
                            </span>
                            <p className="mt-1 text-xs text-slate-400">{shortDate(task.due_date)}</p>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="p-10 text-center text-slate-500">No upcoming deadlines.</div>
              )}
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="space-y-6 lg:col-span-1">
          <Suspense fallback={<OverviewSkeleton />}>
            <StudyOverview />
          </Suspense>

          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600">
              <BrainCircuit className="h-6 w-6" />
            </span>
            <h3 className="font-bold">Plan your week</h3>
            <p className="mb-5 mt-1 text-sm leading-relaxed text-slate-600">
              Auto-fit your deadlines into your Free Time.
            </p>
            <Link href="/planner">
              <Button className="w-full rounded-xl bg-indigo-600 py-6 font-bold text-white hover:bg-indigo-700">
                Open Smart Planner
              </Button>
            </Link>
          </section>
        </aside>
      </div>
    </>
  )
}

/* ---------- small pieces ---------- */

function OverviewSkeleton() {
  return <div className="h-80 animate-pulse rounded-2xl bg-slate-200" aria-busy="true" />
}

function MainSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true">
      <div className="h-10 w-72 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="h-64 rounded-3xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-48 rounded-2xl bg-slate-200" />
        </div>
        <div className="space-y-6">
          <div className="h-64 rounded-2xl bg-slate-200" />
          <div className="h-48 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  )
}