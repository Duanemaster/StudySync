'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const academicLevel = formData.get('academicLevel') as string
  const timezone = formData.get('timezone') as string
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      academic_level: academicLevel,
      timezone: timezone,
    })
    .eq('id', user.id)

  if (error) {
    redirect('/onboarding?message=Could not update profile')
  }

  redirect('/dashboard')
}