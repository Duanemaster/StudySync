'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string
  const academicLevel = formData.get('academicLevel') as string

  const supabase = await createClient()

  // 1. Gawa ng account sa Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return redirect(`/register?error=${error.message}`)
  }

  // 2. I-save ang pangalan at academic level sa profiles table
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: displayName,
      academic_level: academicLevel,
      timezone: 'Asia/Manila' 
    })

    if (profileError) {
      console.error("Profile error:", profileError)
      return redirect('/register?error=Could not save profile details.')
    }
  }

  // 3. Kapag successful, diretso na agad sa Dashboard!
  redirect('/dashboard')
}