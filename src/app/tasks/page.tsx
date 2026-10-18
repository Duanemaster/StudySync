import { createClient } from '@/utils/supabase/server'
import { connection } from 'next/server'
import Link from 'next/link'
import { ListTodo, ArrowLeft } from 'lucide-react'
import TasksManager from './TasksManager'
import type { Task } from '@/components/TaskCard'

export default async function TasksPage() {
  await connection()
  const supabase = await createClient()

  const { data: subjects } = await supabase.from('subjects').select('id, name, color')
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, subjects(name, color)')
    .eq('status', 'pending')
    .order('due_date', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-5 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <ListTodo className="w-8 h-8 text-indigo-600" />
              Tasks & Deadlines
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Keep track of your assignments, exams, and projects.
            </p>
          </div>
        </header>

        <TasksManager
          subjects={subjects ?? []}
          initialTasks={(tasks ?? []) as unknown as Task[]}
        />
      </div>
    </div>
  )
}