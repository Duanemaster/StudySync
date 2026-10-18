'use client'

import { useOptimistic, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Plus, Trash2, GraduationCap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ActionButton from '@/components/ActionButtons'
import { SubmitButton } from '@/components/SubmitButton'
import { createSubject, deleteSubject } from './actions'

type Subject = {
  id: string
  name: string
  description: string | null
  color: string | null
  pending?: boolean
}

type OptimisticAction = { type: 'add'; subject: Subject } | { type: 'remove'; id: string }

export default function SubjectsManager({ initialSubjects }: { initialSubjects: Subject[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')

  const [subjects, updateSubjects] = useOptimistic(
    initialSubjects,
    (state: Subject[], action: OptimisticAction) => {
      if (action.type === 'add') return [action.subject, ...state]
      return state.filter((s) => s.id !== action.id)
    }
  )

  async function handleAdd(formData: FormData) {
    const name = String(formData.get('name') ?? '').trim()
    if (!name) return

    setError('')
    const id = crypto.randomUUID()
    formData.set('id', id)

    updateSubjects({
      type: 'add',
      subject: {
        id,
        name,
        description: String(formData.get('description') ?? '') || null,
        color: String(formData.get('color') ?? '') || '#4f46e5',
        pending: true,
      },
    })
    formRef.current?.reset()

    const res = await createSubject(formData)
    if (!res.success) setError(res.error ?? 'Could not save. Please try again.')
  }

  async function handleDelete(id: string) {
    setError('')
    updateSubjects({ type: 'remove', id })
    const res = await deleteSubject(id)
    if (!res.success) setError(res.error ?? 'Could not delete. Please try again.')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <Plus className="w-5 h-5 text-indigo-500" /> Add New Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 bg-slate-50/50">
            <form ref={formRef} action={handleAdd} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Subject Name</label>
                  <Input
                    name="name"
                    required
                    placeholder="e.g., Computer Architecture"
                    className="rounded-xl border-slate-200 bg-white h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Color Tag</label>
                  <Input
                    name="color"
                    type="color"
                    defaultValue="#4f46e5"
                    className="h-12 w-full rounded-xl cursor-pointer p-1.5 bg-white border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <Input
                  name="description"
                  placeholder="Optional notes about this subject"
                  className="rounded-xl border-slate-200 bg-white h-12"
                />
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
                <SubmitButton text="Add Subject" className="w-full h-12" />
              </div>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-800 tracking-tight">Active Subjects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {subjects.map((sub) => (
                <motion.div
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85, y: 12 }}
                  animate={{ opacity: sub.pending ? 0.6 : 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 40 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start justify-between hover:border-indigo-300 hover:shadow-md transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-5 h-5 rounded-full shrink-0 mt-0.5 shadow-sm"
                      style={{ backgroundColor: sub.color || '#cbd5e1' }}
                    />
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{sub.name}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-0.5">
                        {sub.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <form action={() => handleDelete(sub.id)}>
                    <ActionButton
                      type="submit"
                      variant="danger"
                      className="!p-2 !rounded-lg"
                      aria-label="Delete subject"
                      title="Delete subject"
                    >
                      <Trash2 className="w-5 h-5" />
                    </ActionButton>
                  </form>
                </motion.div>
              ))}
            </AnimatePresence>

            {subjects.length === 0 && (
              <div className="col-span-full p-10 text-center border border-dashed border-slate-300 rounded-3xl bg-white">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-bold">No subjects added yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="lg:col-span-1 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200"
        >
          <div className="w-12 h-12 bg-indigo-500/30 rounded-2xl flex items-center justify-center mb-6">
            <GraduationCap className="w-6 h-6 text-indigo-100" />
          </div>
          <h3 className="font-bold text-2xl mb-2">Subject Stats</h3>
          <p className="text-indigo-200 text-sm font-medium mb-8">
            Keep your courses organized for better tracking.
          </p>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-indigo-700/50 pb-4">
              <span className="text-indigo-200 font-medium">Total Subjects</span>
              <motion.span
                key={subjects.length}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-black"
              >
                {subjects.length}
              </motion.span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}