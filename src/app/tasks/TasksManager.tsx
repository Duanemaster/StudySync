'use client'

import { useOptimistic, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubmitButton } from '@/components/SubmitButton'
import { TaskCard, type Task } from '@/components/TaskCard'
import { createTask, markTaskAsDone } from './actions'

type SubjectOption = { id: string; name: string; color: string | null }

type OptimisticAction = { type: 'add'; task: Task } | { type: 'remove'; id: string }

export default function TasksManager({
  subjects,
  initialTasks,
}: {
  subjects: SubjectOption[]
  initialTasks: Task[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')

  const [tasks, updateTasks] = useOptimistic(
    initialTasks,
    (state: Task[], action: OptimisticAction) => {
      if (action.type === 'add') {
        return [...state, action.task].sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
      }
      return state.filter((t) => t.id !== action.id)
    }
  )

  async function handleAdd(formData: FormData) {
    const title = String(formData.get('title') ?? '').trim()
    const dueDate = String(formData.get('dueDate') ?? '')
    if (!title || !dueDate) return

    setError('')
    const id = crypto.randomUUID()
    formData.set('id', id)

    const subject = subjects.find((s) => s.id === String(formData.get('subjectId')))

    updateTasks({
      type: 'add',
      task: {
        id,
        title,
        type: String(formData.get('type') ?? 'assignment'),
        due_date: new Date(dueDate).toISOString(),
        priority: parseInt(String(formData.get('priority') ?? '2')),
        estimated_mins: parseInt(String(formData.get('estimatedMins') ?? '60')),
        subjects: subject ? { name: subject.name, color: subject.color } : null,
        pending: true,
      },
    })
    formRef.current?.reset()

    const res = await createTask(formData)
    if (!res.success) setError(res.error ?? 'Could not save. Please try again.')
  }

  async function handleDone(id: string) {
    setError('')
    updateTasks({ type: 'remove', id })
    const res = await markTaskAsDone(id)
    if (!res.success) setError(res.error ?? 'Could not update. Please try again.')
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Plus className="w-5 h-5 text-indigo-500" /> Add New Task
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 bg-slate-50/50">
          <form ref={formRef} action={handleAdd} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-bold text-slate-700">Task Title</label>
                <Input
                  name="title"
                  required
                  placeholder="e.g., Chapter 1 Quiz"
                  className="rounded-xl border-slate-200 bg-white h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Subject</label>
                <select
                  name="subjectId"
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Type</label>
                <select
                  name="type"
                  required
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                  <option value="project">Project</option>
                  <option value="reading">Reading</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Due Date & Time</label>
                <Input
                  name="dueDate"
                  type="datetime-local"
                  required
                  className="rounded-xl border-slate-200 bg-white h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Priority</label>
                  <Input
                    name="priority"
                    type="number"
                    min="1"
                    max="3"
                    defaultValue="2"
                    required
                    className="rounded-xl border-slate-200 bg-white h-11"
                    title="1 = High, 3 = Low"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Est. Mins</label>
                  <Input
                    name="estimatedMins"
                    type="number"
                    min="5"
                    defaultValue="60"
                    required
                    className="rounded-xl border-slate-200 bg-white h-11"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-semibold text-rose-600"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex justify-end pt-2">
              <SubmitButton text="Create Task" className="w-full md:w-auto px-10 h-11" />
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold mb-4 text-slate-800 tracking-tight">Pending Deadlines</h2>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onDone={handleDone} />
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <div className="p-12 text-center border border-dashed border-slate-300 rounded-3xl bg-white flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">You're all caught up!</h3>
              <p className="text-slate-500 font-medium mt-1">
                No pending tasks found. Enjoy your free time.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}