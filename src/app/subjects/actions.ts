'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: boolean; error?: string }

export async function createSubject(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return { success: false, error: 'You must be logged in to create a subject.' }
  }

  const id = (formData.get('id') as string) || null
  const name = ((formData.get('name') as string) || '').trim()
  const description = (formData.get('description') as string) || null
  const color = (formData.get('color') as string) || '#4F46E5'

  if (!name) return { success: false, error: 'Subject name is required.' }

  const { error } = await supabase.from('subjects').insert({
    ...(id ? { id } : {}),
    user_id: session.user.id,
    name,
    description,
    color,
  })

  if (error) {
    console.error('Database insert error:', error)
    return { success: false, error: 'Failed to create subject: ' + error.message }
  }

  revalidatePath('/subjects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('subjects').delete().eq('id', id)

  if (error) {
    console.error('Delete subject error:', error)
    return { success: false, error: 'Failed to delete subject: ' + error.message }
  }

  revalidatePath('/subjects')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function createTopic(subjectId: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const difficulty = parseInt(formData.get('difficulty') as string)
  const estimatedMins = parseInt(formData.get('estimatedMins') as string)

  const { error } = await supabase.from('topics').insert({
    subject_id: subjectId,
    name,
    difficulty,
    estimated_mins: estimatedMins,
  })

  if (error) {
    console.error('Topic insert error:', error)
  }

  revalidatePath(`/subjects/${subjectId}`)
}