'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: boolean; error?: string }

export async function addAvailability(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return { success: false, error: 'You must be logged in to set availability.' }
  }

  const id = (formData.get('id') as string) || null
  const dayOfWeek = parseInt(formData.get('dayOfWeek') as string)
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string
  const duration = parseInt((formData.get('duration') as string) || '60')

  if (!startTime || !endTime) return { success: false, error: 'Start and end time are required.' }
  if (endTime <= startTime) return { success: false, error: 'End time must be later than start time.' }

  const { error } = await supabase.from('study_availability').insert({
    ...(id ? { id } : {}),
    user_id: session.user.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    preferred_duration_mins: duration,
  })

  if (error) {
    console.error('Insert error:', error)
    return { success: false, error: 'Failed to add availability: ' + error.message }
  }

  revalidatePath('/availability')
  revalidatePath('/planner')
  return { success: true }
}

export async function deleteAvailability(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('study_availability').delete().eq('id', id)

  if (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Failed to delete availability: ' + error.message }
  }

  revalidatePath('/availability')
  revalidatePath('/planner')
  return { success: true }
}