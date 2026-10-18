import { createClient } from '@/utils/supabase/server'
import { DAY_MS, localDayKey } from '@/lib/planner'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type FocusStats = {
  todayMins: number
  weekMins: number
  streak: number
  available: boolean
}

export async function getFocusStats(supabase: ServerClient): Promise<FocusStats> {
  const since = new Date(Date.now() - 45 * DAY_MS).toISOString()
  const { data, error } = await supabase
    .from('study_sessions')
    .select('minutes, created_at')
    .gte('created_at', since)

  // If the table does not exist yet, do not crash
  if (error || !data) return { todayMins: 0, weekMins: 0, streak: 0, available: false }

  const byDay = new Map<string, number>()
  for (const row of data) {
    const key = localDayKey(new Date(row.created_at).getTime())
    byDay.set(key, (byDay.get(key) ?? 0) + (row.minutes ?? 0))
  }

  const now = Date.now()
  const todayMins = byDay.get(localDayKey(now)) ?? 0

  let weekMins = 0
  for (let i = 0; i < 7; i++) weekMins += byDay.get(localDayKey(now - i * DAY_MS)) ?? 0

  // Streak: not broken yet if there is no session today
  let streak = 0
  let cursor = now
  if (!byDay.has(localDayKey(cursor))) cursor -= DAY_MS
  while (byDay.has(localDayKey(cursor))) {
    streak++
    cursor -= DAY_MS
  }

  return { todayMins, weekMins, streak, available: true }
}