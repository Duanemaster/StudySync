'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, Flag, Check } from 'lucide-react'
import ActionButton from '@/components/ActionButtons'

export type Task = {
  id: string
  title: string
  type: string
  due_date: string
  priority: number
  estimated_mins: number
  subjects: { name: string; color: string | null } | null
  pending?: boolean
}

export function TaskCard({ task, onDone }: { task: Task; onDone: (id: string) => Promise<void> }) {
  const dueDate = new Date(task.due_date)
  const isOverdue = dueDate < new Date()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: task.pending ? 0.6 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-0 flex flex-col md:flex-row overflow-hidden hover:border-indigo-200 transition-colors group"
    >
      <div
        className="w-full md:w-2 h-2 md:h-auto shrink-0"
        style={{ backgroundColor: task.subjects?.color || '#cbd5e1' }}
      />

      <div className="flex-1 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
            {task.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {task.subjects?.name || 'No Subject'}
            </span>
            <span className="text-xs font-semibold text-slate-500 capitalize flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              {task.type}
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Flag className="w-3.5 h-3.5" /> P{task.priority}
            </span>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 md:gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 mt-2 md:mt-0">
          <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-1">
            <div
              suppressHydrationWarning
              className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg ${
                isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {dueDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {task.estimated_mins} mins
            </div>
          </div>

          <form action={() => onDone(task.id)}>
            <ActionButton type="submit" variant="success" className="!px-3 !py-1.5">
              <Check className="w-4 h-4" /> Done
            </ActionButton>
          </form>
        </div>
      </div>
    </motion.div>
  )
}