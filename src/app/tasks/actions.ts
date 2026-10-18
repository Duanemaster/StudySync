'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: boolean; error?: string }

function refresh() {
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  revalidatePath('/planner')
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return { success: false, error: 'You must be logged in to create a task.' }
  }

  const id = (formData.get('id') as string) || null
  const title = ((formData.get('title') as string) || '').trim()
  const subjectId = formData.get('subjectId') as string
  const type = formData.get('type') as string
  const dueDate = formData.get('dueDate') as string
  const priority = parseInt(formData.get('priority') as string)
  const estimatedMins = parseInt((formData.get('estimatedMins') as string) || '60')

  if (!title || !dueDate) return { success: false, error: 'Title and due date are required.' }

  const { error } = await supabase.from('tasks').insert({
    ...(id ? { id } : {}),
    user_id: session.user.id,
    subject_id: subjectId || null,
    title,
    type,
    due_date: new Date(dueDate).toISOString(),
    priority,
    estimated_mins: estimatedMins,
  })

  if (error) {
    console.error('Task insert error:', error)
    return { success: false, error: 'Failed to create task: ' + error.message }
  }

  refresh()
  return { success: true }
}

export async function markTaskAsDone(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', id)

  if (error) {
    console.error('Task update error:', error)
    return { success: false, error: 'Failed to update task: ' + error.message }
  }

  refresh()
  return { success: true }
}