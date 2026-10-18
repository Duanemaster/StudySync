'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  
  if (error) {
    redirect('/login?message=Could not authenticate user')
  }
  
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string
  const supabase = await createClient()

  const { error, data } = await supabase.auth.signUp({ email, password })
  
  if (error) {
    redirect('/register?message=Could not create user')
  }

  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: displayName,
    })
  }
  
  redirect('/onboarding')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}