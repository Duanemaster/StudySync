'use client'

import { useOptimistic, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, CalendarDays, Trash2, Hourglass } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ActionButton from '@/components/ActionButtons'
import { SubmitButton } from '@/components/SubmitButton'
import { addAvailability, deleteAvailability } from './actions'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type Slot = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  preferred_duration_mins: number
  pending?: boolean
}

type OptimisticAction = { type: 'add'; slot: Slot } | { type: 'remove'; id: string }

export default function AvailabilityManager({ initialSlots }: { initialSlots: Slot[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')

  const [slots, updateSlots] = useOptimistic(
    initialSlots,
    (state: Slot[], action: OptimisticAction) => {
      if (action.type === 'add') {
        return [...state, action.slot].sort(
          (a, b) =>
            a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
        )
      }
      return state.filter((s) => s.id !== action.id)
    }
  )

  async function handleAdd(formData: FormData) {
    const startTime = String(formData.get('startTime') ?? '')
    const endTime = String(formData.get('endTime') ?? '')
    if (!startTime || !endTime) return

    if (endTime <= startTime) {
      setError('End time must be later than start time.')
      return
    }

    setError('')
    const id = crypto.randomUUID()
    formData.set('id', id)

    updateSlots({
      type: 'add',
      slot: {
        id,
        day_of_week: parseInt(String(formData.get('dayOfWeek') ?? '0')),
        start_time: startTime,
        end_time: endTime,
        preferred_duration_mins: parseInt(String(formData.get('duration') ?? '60')),
        pending: true,
      },
    })
    formRef.current?.reset()

    const res = await addAvailability(formData)
    if (!res.success) setError(res.error ?? 'Could not save. Please try again.')
  }

  async function handleDelete(id: string) {
    setError('')
    updateSlots({ type: 'remove', id })
    const res = await deleteAvailability(id)
    if (!res.success) setError(res.error ?? 'Could not delete. Please try again.')
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Plus className="w-5 h-5 text-indigo-500" /> Add Available Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 bg-slate-50/50">
          <form
            ref={formRef}
            action={handleAdd}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Day of Week</label>
              <select
                name="dayOfWeek"
                required
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Start Time</label>
              <Input
                name="startTime"
                type="time"
                required
                className="rounded-xl border-slate-200 bg-white h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">End Time</label>
              <Input
                name="endTime"
                type="time"
                required
                className="rounded-xl border-slate-200 bg-white h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Pref. Mins</label>
              <Input
                name="duration"
                type="number"
                defaultValue="60"
                min="15"
                className="rounded-xl border-slate-200 bg-white h-11"
                title="Target duration per study session (e.g., 60 mins)"
              />
            </div>

            <div className="lg:col-span-4 flex flex-col items-end gap-3 pt-2">
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-semibold text-rose-600 self-start"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <SubmitButton text="Add Time Slot" className="w-full md:w-auto px-10 h-11" />
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold mb-4 text-slate-800 tracking-tight">Current Availability</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {slots.map((slot) => (
              <motion.div
                key={slot.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 12 }}
                animate={{ opacity: slot.pending ? 0.6 : 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 40 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex justify-between items-center hover:border-indigo-200 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {DAYS_OF_WEEK[slot.day_of_week]}
                    </h3>
                    <p className="text-sm font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1 text-indigo-500">
                        <Hourglass className="w-3.5 h-3.5" /> {slot.preferred_duration_mins} mins
                      </span>
                    </p>
                  </div>
                </div>
                <form action={() => handleDelete(slot.id)}>
                  <ActionButton
                    type="submit"
                    variant="danger"
                    className="!p-2 !rounded-lg"
                    aria-label="Delete time slot"
                    title="Delete time slot"
                  >
                    <Trash2 className="w-5 h-5" />
                  </ActionButton>
                </form>
              </motion.div>
            ))}
          </AnimatePresence>

          {slots.length === 0 && (
            <div className="col-span-full p-10 text-center border border-dashed border-slate-300 rounded-3xl bg-white flex flex-col items-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-bold text-lg">No study times set yet.</p>
              <p className="text-slate-400 font-medium text-sm mt-1">Add your available schedule above.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}