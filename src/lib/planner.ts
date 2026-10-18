// Philippine time (UTC+8, no DST). Change these if you are in another timezone.
export const TIMEZONE = 'Asia/Manila'
export const TZ_OFFSET_HOURS = 8

export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000
export const HORIZON_DAYS = 7
export const MIN_CHUNK_MINS = 15

export type Availability = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  preferred_duration_mins: number | null
}

export type PlannerTask = {
  id: string
  title: string
  priority: number | null
  due_date: string
  estimated_mins: number | null
  subjects?: { name: string; color: string | null } | null
}

export type Block = {
  task: PlannerTask
  mins: number
  part: number
  parts: number
}

export type Occurrence = {
  key: string
  dateKey: string
  startMs: number
  start: string
  end: string
  capacity: number
  used: number
  remaining: number
  blocks: Block[]
}

export type UnscheduledTask = {
  task: PlannerTask
  missingMins: number
  plannedMins: number
  overdue: boolean
}

export type Plan = {
  todayKey: string
  occurrences: Occurrence[]
  unscheduled: UnscheduledTask[]
  totalCapacity: number
  totalPlanned: number
}

export function localDayKey(ms: number) {
  return new Date(ms + TZ_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10)
}

export function formatMins(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatDue(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: TIMEZONE,
  })
}

export function describeDate(dateKey: string, todayKey: string) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  const label = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const diff = Math.round(
    (d.getTime() - new Date(`${todayKey}T00:00:00Z`).getTime()) / DAY_MS
  )
  const tag = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : null
  return { label, tag }
}

function toMinutes(t: string) {
  const [h, m] = t.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

export function buildPlan(
  availabilities: Availability[],
  tasks: PlannerTask[],
  now: number = Date.now()
): Plan {
  const local = new Date(now + TZ_OFFSET_HOURS * HOUR_MS)
  const y = local.getUTCFullYear()
  const m = local.getUTCMonth()
  const d = local.getUTCDate()

  // 1. Build every slot occurrence for the next 7 days
  const occurrences: Occurrence[] = []
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const dayMs = Date.UTC(y, m, d + i)
    const dayDate = new Date(dayMs)
    const dow = dayDate.getUTCDay()
    const dateKey = dayDate.toISOString().slice(0, 10)

    for (const slot of availabilities) {
      if (slot.day_of_week !== dow) continue

      const startMin = toMinutes(slot.start_time)
      const endMin = toMinutes(slot.end_time)
      const windowMins = endMin - startMin
      if (windowMins < MIN_CHUNK_MINS) continue // too short to use

      const startMs = dayMs + startMin * 60_000 - TZ_OFFSET_HOURS * HOUR_MS
      const endMs = dayMs + endMin * 60_000 - TZ_OFFSET_HOURS * HOUR_MS
      if (endMs <= now) continue // already over

      let capacity = Math.min(slot.preferred_duration_mins || 60, windowMins)
      if (startMs < now) {
        // slot already started, subtract the time that has passed
        capacity = Math.min(capacity, Math.floor((endMs - now) / 60_000))
      }
      if (capacity <= 0) continue

      occurrences.push({
        key: `${dateKey}-${slot.id}`,
        dateKey,
        startMs,
        start: slot.start_time.slice(0, 5),
        end: slot.end_time.slice(0, 5),
        capacity,
        used: 0,
        remaining: capacity,
        blocks: [],
      })
    }
  }
  occurrences.sort((a, b) => a.startMs - b.startMs)

  // 2. Sort tasks by due date first, then priority
  const sorted = [...tasks].sort((a, b) => {
    const byDue = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    return byDue || (a.priority ?? 2) - (b.priority ?? 2)
  })
  const remaining = new Map<string, number>(
    sorted.map((t) => [t.id, t.estimated_mins || 30])
  )

  // 3. Fill the slots (tasks bigger than a slot get split into parts)
  for (const occ of occurrences) {
    let cap = occ.capacity
    for (const task of sorted) {
      if (cap <= 0) break
      const rem = remaining.get(task.id) ?? 0
      if (rem <= 0) continue
      if (occ.startMs >= new Date(task.due_date).getTime()) continue // slot is after the due date

      const alloc = Math.min(rem, cap)
      if (alloc < MIN_CHUNK_MINS && alloc < rem) continue // avoid tiny leftover parts

      occ.blocks.push({ task, mins: alloc, part: 1, parts: 1 })
      remaining.set(task.id, rem - alloc)
      cap -= alloc
    }
    occ.remaining = cap
    occ.used = occ.capacity - cap
  }

  // 4. Part numbering (Part 1/3)
  const totals = new Map<string, number>()
  for (const occ of occurrences)
    for (const b of occ.blocks) totals.set(b.task.id, (totals.get(b.task.id) ?? 0) + 1)
  const counters = new Map<string, number>()
  for (const occ of occurrences) {
    for (const b of occ.blocks) {
      const n = (counters.get(b.task.id) ?? 0) + 1
      counters.set(b.task.id, n)
      b.part = n
      b.parts = totals.get(b.task.id) ?? 1
    }
  }

  // 5. Tasks that did not fit
  const unscheduled: UnscheduledTask[] = sorted
    .filter((t) => (remaining.get(t.id) ?? 0) > 0)
    .map((t) => {
      const missing = remaining.get(t.id) ?? 0
      const total = t.estimated_mins || 30
      return {
        task: t,
        missingMins: missing,
        plannedMins: total - missing,
        overdue: new Date(t.due_date).getTime() < now,
      }
    })

  return {
    todayKey: localDayKey(now),
    occurrences,
    unscheduled,
    totalCapacity: occurrences.reduce((s, o) => s + o.capacity, 0),
    totalPlanned: occurrences.reduce((s, o) => s + o.used, 0),
  }
}