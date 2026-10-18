import { createClient } from '@/utils/supabase/server'
import { connection } from 'next/server'
import { getFocusStats } from '@/lib/focus-stats'
import StudyRoom, { type StudyTask } from './StudyRoom'

export default async function StudyRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string; mins?: string }>
}) {
  await connection()
  const { task, mins } = await searchParams
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, type, due_date, estimated_mins, subjects(name, color)')
    .eq('status', 'pending')
    .order('due_date', { ascending: true })

  const stats = await getFocusStats(supabase)
  const parsedMins = mins ? parseInt(mins, 10) : NaN

  return (
    <StudyRoom
      tasks={(tasks ?? []) as unknown as StudyTask[]}
      initialTaskId={task ?? null}
      plannedMins={Number.isFinite(parsedMins) ? parsedMins : null}
      stats={stats}
    />
  )
}